<?php
/**
 * Marklight – bootstrap: configuration, security headers and helpers.
 * Engineered by EinfachDev · GPL-3.0-or-later
 *
 * Security model
 * --------------
 * - No database, no sessions, no cookies, no server-side storage of documents.
 * - All Markdown is parsed and sanitized in the browser (DOMPurify).
 * - Strict Content-Security-Policy: scripts only from this origin, no inline JS,
 *   no third-party connections, no framing.
 * - Only the public/ directory is web-accessible; this file lives outside it.
 */
declare(strict_types=1);

namespace Marklight;

const VERSION = '1.1.0';

if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    exit('Marklight requires PHP 8.1 or newer.');
}

/** Merged configuration (defaults + optional config.local.php). */
function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $cfg = require dirname(__DIR__) . '/config/config.php';
        $local = dirname(__DIR__) . '/config/config.local.php';
        if (is_file($local)) {
            $override = require $local;
            if (is_array($override)) {
                $cfg = array_replace_recursive($cfg, $override);
                // Lists are replaced, not merged index-by-index.
                foreach ([['fetch', 'allowed_hosts'], ['german_countries']] as $path) {
                    $src = $override;
                    foreach ($path as $k) {
                        $src = is_array($src) && array_key_exists($k, $src) ? $src[$k] : null;
                    }
                    if ($src !== null) {
                        $ref = &$cfg;
                        foreach ($path as $k) {
                            $ref = &$ref[$k];
                        }
                        $ref = array_values((array) $src);
                        unset($ref);
                    }
                }
            }
        }
    }
    return $cfg;
}

/** HTML-escape for text and attribute context. */
function e(string|int|float|null $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
}

/** Headers that apply to every response. */
function send_common_headers(): void
{
    if (headers_sent()) {
        return;
    }
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
    if (config()['hsts'] && is_https()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

/** Headers for HTML pages. */
function send_page_headers(): void
{
    send_common_headers();
    if (headers_sent()) {
        return;
    }
    header('Content-Type: text/html; charset=utf-8');
    // 'unsafe-inline' for styles is required by KaTeX/Mermaid output (style attributes).
    // Scripts: same origin only – there is no inline JavaScript anywhere.
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'inline-speculation-rules'; style-src 'self' 'unsafe-inline'; "
        . "img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; "
        . "worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; "
        . "form-action 'self'; frame-ancestors 'none'"
        . (is_https() ? '; upgrade-insecure-requests' : ''));
    header('Cache-Control: no-cache');
}

/**
 * Visitor's country (ISO 3166-1 alpha-2, upper case) or null.
 * Only read from sources the operator explicitly configured – never from arbitrary headers.
 */
function country(): ?string
{
    static $cc = false;
    if ($cc !== false) {
        return $cc;
    }
    $geo = config()['geo'];
    $raw = match ($geo['source'] ?? 'none') {
        'server_var' => $_SERVER[(string) ($geo['server_var'] ?? 'GEOIP_COUNTRY_CODE')] ?? null,
        'cloudflare' => $_SERVER['HTTP_CF_IPCOUNTRY'] ?? null,
        default      => null,
    };
    $raw = is_string($raw) ? strtoupper(trim($raw)) : '';
    return $cc = preg_match('/^[A-Z]{2}$/', $raw) && !in_array($raw, ['XX', 'T1'], true) ? $raw : null;
}

/** Default UI language for this request: 'de' or 'en'. */
function ui_lang(): string
{
    $cfg = config();
    $mode = $cfg['default_lang'] ?? 'auto';
    if ($mode === 'de' || $mode === 'en') {
        return $mode;
    }
    $cc = country();
    if ($cc !== null) {
        return in_array($cc, (array) $cfg['german_countries'], true) ? 'de' : 'en';
    }
    // No country known: fall back to the browser's preferred language.
    $al = strtolower((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''));
    foreach (explode(',', $al) as $part) {
        $tag = trim(explode(';', $part)[0]);
        if ($tag === '' || $tag === '*') {
            continue;
        }
        return str_starts_with($tag, 'de') ? 'de' : 'en';
    }
    return 'en';
}

/**
 * Redirects legacy "/reader.php" style URLs to clean ones ("/reader").
 * The web server maps the clean URL back to the .php file internally.
 */
function canonical_redirect(string $page): void
{
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '');
    $path = (string) parse_url($uri, PHP_URL_PATH);
    if (!preg_match('#(^|/)' . preg_quote($page, '#') . '\.php$#', $path)) {
        return;
    }
    $clean = substr($path, 0, -strlen($page . '.php')) . ($page === 'index' ? '' : $page);
    $query = parse_url($uri, PHP_URL_QUERY);
    header('Location: ' . ($clean === '' ? '/' : $clean) . ($query ? '?' . $query : ''), true, 301);
    exit;
}

/** Public, non-sensitive settings exposed to the front-end. */
function client_config(): array
{
    return [
        'fetch'   => (bool) config()['fetch']['enabled'],
        'version' => VERSION,
    ];
}
