# Security Policy

Marklight is built to store **no user data on the server**: no database, no accounts, no cookies, no logs of documents. All Markdown processing happens in the browser.

## Supported versions

Only the latest release on the `main` branch receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.
Use GitHub's private reporting instead: *Security → Report a vulnerability* in this repository.

Please include:

- affected file / endpoint (e.g. `public/api/fetch.php`)
- steps to reproduce or a proof of concept
- the impact you expect

You will get an answer as soon as possible. Fixed issues are credited in the release notes unless you prefer otherwise.

## Scope

In scope: XSS in rendered Markdown, CSP bypasses, SSRF / DNS rebinding in the URL loader, path traversal, information disclosure, insecure defaults in the Docker image.

Out of scope: denial of service by sending huge documents to your *own* browser, issues that require a malicious browser extension, and self-hosted instances where the operator disabled the documented protections (e.g. `allowed_hosts = ['*']` combined with a document root outside `public/`).

— engineered by EinfachDev
