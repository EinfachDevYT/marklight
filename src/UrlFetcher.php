<?php
/**
 * Marklight – SSRF-hardened fetcher for remote Markdown files.
 * Engineered by EinfachDev · GPL-3.0-or-later
 *
 * Defences:
 *  - scheme allow-list (https, optionally http), default ports only, no credentials in URL
 *  - host allow-list (exact or "*.domain" wildcard, or "*" for any public host)
 *  - DNS is resolved by us; EVERY returned address must be public (no loopback, private,
 *    link-local, CGNAT, multicast, reserved, documentation, NAT64/6to4/IPv4-mapped ranges)
 *  - the validated IP is pinned via CURLOPT_RESOLVE → no DNS-rebinding window
 *  - redirects are followed manually and every hop is validated again
 *  - environment proxies are ignored, TLS verification is enforced
 *  - hard limits on time, size and redirects; binary content is rejected
 */
declare(strict_types=1);

namespace Marklight;

final class FetchException extends \RuntimeException
{
    public function __construct(public readonly string $errorCode, public readonly int $httpStatus = 400)
    {
        parent::__construct($errorCode);
    }
}

final class UrlFetcher
{
    /** Blocked networks (CIDR). Anything matching is never contacted. */
    private const BLOCKED = [
        // IPv4
        '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12',
        '192.0.0.0/24', '192.0.2.0/24', '192.31.196.0/24', '192.52.193.0/24', '192.88.99.0/24',
        '192.168.0.0/16', '192.175.48.0/24', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24',
        '224.0.0.0/4', '240.0.0.0/4', '255.255.255.255/32',
        // IPv6
        '::/128', '::1/128', '::ffff:0:0/96', '::/96', '64:ff9b::/96', '64:ff9b:1::/48', '100::/64',
        '2001::/23', '2001:db8::/32', '2002::/16', '3fff::/20', '5f00::/16', 'fc00::/7', 'fe80::/10',
        'fec0::/10', 'ff00::/8',
    ];

    /** @param array<string,mixed> $cfg the "fetch" config section */
    public function __construct(private readonly array $cfg)
    {
    }

    /**
     * @return array{body:string, url:string, contentType:string}
     */
    public function fetch(string $url): array
    {
        $maxRedirects = (int) ($this->cfg['max_redirects'] ?? 3);
        for ($hop = 0; $hop <= $maxRedirects; $hop++) {
            $target = $this->validateUrl($url);
            $ip = $this->resolvePublicIp($target['host']);
            $res = $this->request($target, $ip);

            if ($res['status'] >= 300 && $res['status'] < 400 && $res['location'] !== '') {
                $url = self::resolveRelative($url, $res['location']);
                continue;
            }
            if ($res['status'] !== 200) {
                throw new FetchException('upstream_status', 502);
            }
            $ct = strtolower(trim(explode(';', $res['contentType'])[0]));
            if ($ct !== '' && !str_starts_with($ct, 'text/') && !in_array($ct, ['application/octet-stream', 'application/json', 'application/x-markdown'], true)) {
                throw new FetchException('not_text', 415);
            }
            $body = $res['body'];
            if (str_contains($body, "\0")) {
                throw new FetchException('not_text', 415);
            }
            if (str_starts_with($body, "\xEF\xBB\xBF")) {
                $body = substr($body, 3);
            }
            if (!mb_check_encoding($body, 'UTF-8')) {
                $body = mb_convert_encoding($body, 'UTF-8', 'Windows-1252');
            }
            return ['body' => $body, 'url' => $url, 'contentType' => $ct];
        }
        throw new FetchException('too_many_redirects', 502);
    }

    /**
     * Parses and validates a URL against scheme/port/host rules.
     * @return array{scheme:string, host:string, port:int, url:string}
     */
    public function validateUrl(string $url): array
    {
        if ($url === '' || strlen($url) > 2048 || preg_match('/[\x00-\x20\x7f]/', $url)) {
            throw new FetchException('invalid_url');
        }
        $parts = parse_url($url);
        if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
            throw new FetchException('invalid_url');
        }
        $scheme = strtolower($parts['scheme']);
        $allowed = ['https'];
        if (!empty($this->cfg['allow_http'])) {
            $allowed[] = 'http';
        }
        if (!in_array($scheme, $allowed, true)) {
            throw new FetchException('scheme_not_allowed');
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            throw new FetchException('invalid_url');
        }
        $defaultPort = $scheme === 'https' ? 443 : 80;
        $port = (int) ($parts['port'] ?? $defaultPort);
        if ($port !== $defaultPort) {
            throw new FetchException('port_not_allowed');
        }
        $host = strtolower(rtrim($parts['host'], '.'));
        if (str_starts_with($host, '[') && str_ends_with($host, ']')) {
            $host = substr($host, 1, -1);
        }
        if (!preg_match('/^[a-z0-9.:-]+$/', $host)) {
            // non-ASCII (IDN) hosts must be given in punycode form
            throw new FetchException('invalid_url');
        }
        if (!$this->hostAllowed($host)) {
            throw new FetchException('host_not_allowed', 403);
        }
        return ['scheme' => $scheme, 'host' => $host, 'port' => $port, 'url' => $url];
    }

    public function hostAllowed(string $host): bool
    {
        $list = (array) ($this->cfg['allowed_hosts'] ?? []);
        $isIp = filter_var($host, FILTER_VALIDATE_IP) !== false;
        foreach ($list as $pattern) {
            $pattern = strtolower(trim((string) $pattern));
            if ($pattern === '*') {
                return true;
            }
            if ($isIp) {
                continue; // IP literals only pass with "*"
            }
            if ($pattern === $host) {
                return true;
            }
            if (str_starts_with($pattern, '*.') && str_ends_with($host, substr($pattern, 1)) && strlen($host) > strlen($pattern) - 1) {
                return true;
            }
        }
        return false;
    }

    /** Resolves a host and returns one IP – only if ALL resolved addresses are public. */
    public function resolvePublicIp(string $host): string
    {
        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            $ips = [$host];
        } else {
            $ips = [];
            $records = @dns_get_record($host, DNS_A | DNS_AAAA);
            foreach ($records ?: [] as $r) {
                if (isset($r['ip'])) {
                    $ips[] = $r['ip'];
                } elseif (isset($r['ipv6'])) {
                    $ips[] = $r['ipv6'];
                }
            }
            if (!$ips) {
                $v4 = @gethostbynamel($host);
                $ips = $v4 ?: [];
            }
        }
        if (!$ips) {
            throw new FetchException('dns_failed', 502);
        }
        foreach ($ips as $ip) {
            if (!self::isPublicIp($ip)) {
                throw new FetchException('private_address', 403);
            }
        }
        foreach ($ips as $ip) {
            if (str_contains($ip, '.')) {
                return $ip; // prefer IPv4
            }
        }
        return $ips[0];
    }

    public static function isPublicIp(string $ip): bool
    {
        if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return false;
        }
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }
        foreach (self::BLOCKED as $cidr) {
            if (self::inCidr($ip, $cidr)) {
                return false;
            }
        }
        return true;
    }

    public static function inCidr(string $ip, string $cidr): bool
    {
        [$net, $bits] = explode('/', $cidr);
        $ipBin = @inet_pton($ip);
        $netBin = @inet_pton($net);
        if ($ipBin === false || $netBin === false || strlen($ipBin) !== strlen($netBin)) {
            return false;
        }
        $bits = (int) $bits;
        $bytes = intdiv($bits, 8);
        if (strncmp($ipBin, $netBin, $bytes) !== 0) {
            return false;
        }
        $rest = $bits % 8;
        if ($rest === 0) {
            return true;
        }
        $mask = (0xFF << (8 - $rest)) & 0xFF;
        return (ord($ipBin[$bytes]) & $mask) === (ord($netBin[$bytes]) & $mask);
    }

    public static function resolveRelative(string $base, string $location): string
    {
        if (preg_match('#^[a-z][a-z0-9+.-]*:#i', $location)) {
            return $location;
        }
        $b = parse_url($base);
        $origin = $b['scheme'] . '://' . $b['host'] . (isset($b['port']) ? ':' . $b['port'] : '');
        if (str_starts_with($location, '//')) {
            return $b['scheme'] . ':' . $location;
        }
        if (str_starts_with($location, '/')) {
            return $origin . $location;
        }
        $dir = preg_replace('#/[^/]*$#', '/', $b['path'] ?? '/');
        return $origin . $dir . $location;
    }

    /**
     * @param array{scheme:string, host:string, port:int, url:string} $t
     * @return array{status:int, location:string, contentType:string, body:string}
     */
    private function request(array $t, string $ip): array
    {
        if (!function_exists('curl_init')) {
            throw new FetchException('curl_missing', 500);
        }
        $max = (int) ($this->cfg['max_bytes'] ?? 2_000_000);
        $body = '';
        $location = '';
        $contentType = '';
        $tooLarge = false;
        $pin = $t['host'] . ':' . $t['port'] . ':' . (str_contains($ip, ':') ? '[' . $ip . ']' : $ip);
        $protocols = CURLPROTO_HTTPS | (!empty($this->cfg['allow_http']) ? CURLPROTO_HTTP : 0);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $t['url'],
            CURLOPT_RESOLVE        => [$pin],
            CURLOPT_PROTOCOLS      => $protocols,
            CURLOPT_REDIR_PROTOCOLS => $protocols,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROXY          => '',      // never use environment proxies
            CURLOPT_NOPROXY        => '*',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT        => (int) ($this->cfg['timeout'] ?? 8),
            CURLOPT_HTTPGET        => true,
            CURLOPT_USERAGENT      => 'Marklight/' . VERSION . ' (+self-hosted markdown reader)',
            CURLOPT_HTTPHEADER     => ['Accept: text/markdown, text/plain;q=0.9, */*;q=0.1'],
            CURLOPT_ENCODING       => '',      // accept gzip/deflate/br
            CURLOPT_HEADERFUNCTION => static function ($ch, string $line) use (&$location, &$contentType): int {
                if (stripos($line, 'location:') === 0) {
                    $location = trim(substr($line, 9));
                } elseif (stripos($line, 'content-type:') === 0) {
                    $contentType = trim(substr($line, 13));
                }
                return strlen($line);
            },
            CURLOPT_WRITEFUNCTION  => static function ($ch, string $chunk) use (&$body, &$tooLarge, $max): int {
                if (strlen($body) + strlen($chunk) > $max) {
                    $tooLarge = true;
                    return 0; // abort transfer
                }
                $body .= $chunk;
                return strlen($chunk);
            },
        ]);
        $ok = curl_exec($ch);
        $errno = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $primaryIp = (string) curl_getinfo($ch, CURLINFO_PRIMARY_IP);
        curl_close($ch);

        if ($tooLarge) {
            throw new FetchException('too_large', 413);
        }
        if ($ok === false) {
            throw new FetchException($errno === CURLE_OPERATION_TIMEDOUT ? 'timeout' : 'connect_failed', 502);
        }
        // Defence in depth: the address we actually talked to must be the pinned, validated one.
        if ($primaryIp !== '' && inet_pton($primaryIp) !== inet_pton($ip)) {
            throw new FetchException('private_address', 403);
        }
        return ['status' => $status, 'location' => $location, 'contentType' => $contentType, 'body' => $body];
    }
}
