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

const VERSION = '1.0.0';

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
                if (isset($override['fetch']['allowed_hosts'])) {
                    $cfg['fetch']['allowed_hosts'] = array_values((array) $override['fetch']['allowed_hosts']);
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
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        . "img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; "
        . "worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; "
        . "form-action 'self'; frame-ancestors 'none'"
        . (is_https() ? '; upgrade-insecure-requests' : ''));
    header('Cache-Control: no-cache');
}

/** Public, non-sensitive settings exposed to the front-end. */
function client_config(): array
{
    return [
        'fetch'   => (bool) config()['fetch']['enabled'],
        'version' => VERSION,
    ];
}
