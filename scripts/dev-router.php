<?php
/**
 * Router for PHP's built-in web server (development only):
 *   php -S localhost:8080 -t public scripts/dev-router.php
 * Mirrors the production rewrite rules: clean URLs → *.php, everything outside public/ is unreachable.
 */
declare(strict_types=1);

$root = realpath(__DIR__ . '/../public');
$path = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

if (preg_match('#^/([a-z]+)$#', $path, $m) && is_file($root . '/' . $m[1] . '.php')) {
    $_SERVER['SCRIPT_NAME'] = '/' . $m[1] . '.php';
    require $root . '/' . $m[1] . '.php';
    return true;
}
if (preg_match('#(^|/)\.#', $path)) {
    http_response_code(404);
    return true;
}
return false; // let the built-in server handle static files and *.php
