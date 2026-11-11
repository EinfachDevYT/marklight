<?php
/**
 * Marklight – GET api/fetch.php?url=…
 * Fetches a remote Markdown file through the SSRF-hardened UrlFetcher and returns it
 * as text/plain. Nothing is stored or logged.
 * Engineered by EinfachDev · GPL-3.0-or-later
 */
declare(strict_types=1);

namespace Marklight;

require dirname(__DIR__, 2) . '/src/bootstrap.php';
require dirname(__DIR__, 2) . '/src/UrlFetcher.php';
require dirname(__DIR__, 2) . '/src/RateLimiter.php';

send_common_headers();
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; sandbox");
header('Cache-Control: no-store');

function fail(string $code, int $status, array $extraHeaders = []): never
{
    http_response_code($status);
    foreach ($extraHeaders as $h) {
        header($h);
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $code]);
    exit;
}

$cfg = config()['fetch'];
if (empty($cfg['enabled'])) {
    fail('disabled', 404);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    fail('method_not_allowed', 405, ['Allow: GET']);
}
// Only our own front-end may use this endpoint from a browser: the custom header forces a CORS
// preflight for cross-site callers, which is never answered (no CORS headers are sent).
if (($_SERVER['HTTP_X_MARKLIGHT'] ?? '') !== '1') {
    fail('forbidden', 403);
}
$site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
if ($site !== '' && !in_array($site, ['same-origin', 'none'], true)) {
    fail('forbidden', 403);
}

$limiter = new RateLimiter((int) ($cfg['rate_limit']['requests'] ?? 30), (int) ($cfg['rate_limit']['window'] ?? 60));
$retry = $limiter->hit((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
if ($retry > 0) {
    fail('rate_limited', 429, ['Retry-After: ' . $retry]);
}

$url = $_GET['url'] ?? '';
if (!is_string($url)) {
    fail('invalid_url', 400);
}

try {
    $result = (new UrlFetcher($cfg))->fetch(trim($url));
} catch (FetchException $ex) {
    fail($ex->errorCode, $ex->httpStatus);
} catch (\Throwable) {
    fail('internal', 500);
}

header('Content-Type: text/plain; charset=utf-8');
header('Content-Disposition: inline; filename="document.md"');
// Final URL after redirects (validated) – needed to resolve relative images/links client-side.
header('X-Final-Url: ' . rawurlencode($result['url']));
echo $result['body'];
