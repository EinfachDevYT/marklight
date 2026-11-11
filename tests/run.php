<?php
/**
 * Marklight – security test-suite (no dependencies).  Run:  php tests/run.php
 * Engineered by EinfachDev · GPL-3.0-or-later
 */
declare(strict_types=1);

namespace Marklight;

require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/UrlFetcher.php';
require __DIR__ . '/../src/RateLimiter.php';

$failed = 0;
$passed = 0;
function check(bool $cond, string $name): void
{
    global $failed, $passed;
    if ($cond) {
        $passed++;
    } else {
        $failed++;
        fwrite(STDERR, "FAIL: $name\n");
    }
}
function throwsCode(callable $fn, string $code): bool
{
    try {
        $fn();
    } catch (FetchException $e) {
        return $e->errorCode === $code;
    }
    return false;
}

/* ---------- IP classification ---------- */
$blocked = [
    '127.0.0.1', '127.1.2.3', '10.0.0.1', '172.16.5.4', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1', '192.0.2.10',
    '::1', '::', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:7f00:1', 'fe80::1', 'fc00::1', 'fd12:3456::1',
    '64:ff9b::7f00:1', '2002:7f00:1::', '2001:db8::1', 'ff02::1', '::127.0.0.1', 'not-an-ip',
];
foreach ($blocked as $ip) {
    check(!UrlFetcher::isPublicIp($ip), "blocked $ip");
}
foreach (['1.1.1.1', '8.8.8.8', '140.82.112.3', '185.199.108.133', '2606:4700:4700::1111', '2a00:1450:4001:80b::200e'] as $ip) {
    check(UrlFetcher::isPublicIp($ip), "public $ip");
}

/* ---------- URL validation ---------- */
$f = new UrlFetcher(['allowed_hosts' => ['raw.githubusercontent.com', '*.example.org'], 'allow_http' => false]);
check(throwsCode(fn () => $f->validateUrl('http://raw.githubusercontent.com/a/b'), 'scheme_not_allowed'), 'http rejected');
check(throwsCode(fn () => $f->validateUrl('file:///etc/passwd'), 'invalid_url') || throwsCode(fn () => $f->validateUrl('file:///etc/passwd'), 'scheme_not_allowed'), 'file:// rejected');
check(throwsCode(fn () => $f->validateUrl('gopher://raw.githubusercontent.com/'), 'scheme_not_allowed'), 'gopher rejected');
check(throwsCode(fn () => $f->validateUrl('https://raw.githubusercontent.com:8443/x'), 'port_not_allowed'), 'custom port rejected');
check(throwsCode(fn () => $f->validateUrl('https://user:pw@raw.githubusercontent.com/x'), 'invalid_url'), 'credentials rejected');
check(throwsCode(fn () => $f->validateUrl('https://evil.com/x'), 'host_not_allowed'), 'host not on allow-list');
check(throwsCode(fn () => $f->validateUrl('https://raw.githubusercontent.com.evil.com/x'), 'host_not_allowed'), 'suffix trick rejected');
check(throwsCode(fn () => $f->validateUrl('https://example.org/x'), 'host_not_allowed'), 'wildcard does not match apex');
check(throwsCode(fn () => $f->validateUrl('https://127.0.0.1/x'), 'host_not_allowed'), 'IP literal needs "*"');
check(throwsCode(fn () => $f->validateUrl("https://raw.githubusercontent.com/a\nb"), 'invalid_url'), 'control chars rejected');
check(throwsCode(fn () => $f->validateUrl('https://exämple.org/'), 'invalid_url'), 'non-ascii host rejected');
check($f->validateUrl('https://raw.githubusercontent.com/u/r/HEAD/README.md')['host'] === 'raw.githubusercontent.com', 'valid URL accepted');
check($f->validateUrl('https://docs.example.org/a.md')['host'] === 'docs.example.org', 'wildcard subdomain accepted');
check($f->validateUrl('https://RAW.GitHubUserContent.com./x')['host'] === 'raw.githubusercontent.com', 'host normalised');

$any = new UrlFetcher(['allowed_hosts' => ['*']]);
check(throwsCode(fn () => $any->resolvePublicIp('127.0.0.1'), 'private_address'), 'loopback literal blocked with "*"');
check(throwsCode(fn () => $any->resolvePublicIp('169.254.169.254'), 'private_address'), 'cloud metadata blocked');
check(throwsCode(fn () => $any->resolvePublicIp('::1'), 'private_address'), 'IPv6 loopback blocked');
check(throwsCode(fn () => $any->resolvePublicIp('localhost'), 'private_address') || throwsCode(fn () => $any->resolvePublicIp('localhost'), 'dns_failed'), 'localhost blocked');
check(throwsCode(fn () => $any->fetch('https://[::1]/'), 'private_address'), 'fetch to [::1] blocked');
check(throwsCode(fn () => $any->fetch('https://127.0.0.1/'), 'private_address'), 'fetch to 127.0.0.1 blocked');

/* ---------- Redirect resolution ---------- */
check(UrlFetcher::resolveRelative('https://a.org/x/y.md', '/z.md') === 'https://a.org/z.md', 'redirect absolute path');
check(UrlFetcher::resolveRelative('https://a.org/x/y.md', 'z.md') === 'https://a.org/x/z.md', 'redirect relative');
check(UrlFetcher::resolveRelative('https://a.org/x/y.md', '//b.org/q') === 'https://b.org/q', 'redirect protocol-relative');
check(UrlFetcher::resolveRelative('https://a.org/', 'http://127.0.0.1/') === 'http://127.0.0.1/', 'redirect absolute kept (validated on next hop)');

/* ---------- Escaping ---------- */
check(e('<script>"\'&') === '&lt;script&gt;&quot;&apos;&amp;', 'html escaping');

/* ---------- Rate limiter ---------- */
$dir = sys_get_temp_dir() . '/marklight-test-' . bin2hex(random_bytes(4));
$rl = new RateLimiter(3, 60, $dir);
check($rl->hit('1.2.3.4') === 0 && $rl->hit('1.2.3.4') === 0 && $rl->hit('1.2.3.4') === 0, 'rate limit allows 3');
check($rl->hit('1.2.3.4') > 0, 'rate limit blocks 4th');
check($rl->hit('5.6.7.8') === 0, 'rate limit is per client');
$stored = implode('', array_map('file_get_contents', glob($dir . '/*.json')));
$names = implode(' ', array_map('basename', glob($dir . '/*')));
check(!str_contains($stored . $names, '1.2.3.4'), 'IP never stored in clear text');
array_map('unlink', array_merge(glob($dir . '/*') ?: [], [$dir . '/.secret']));
@rmdir($dir);

echo "Marklight tests: $passed passed, $failed failed\n";
exit($failed ? 1 : 0);
