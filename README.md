<p align="center">
  <img src="public/assets/img/logo.svg" width="88" height="88" alt="Marklight logo">
</p>

<h1 align="center">Marklight</h1>

<p align="center">
  <b>Markdown, beautifully read.</b><br>
  Privacy-friendly Markdown reader, editor and toolbox. Self-hostable with plain PHP, no database.<br>
  <sub>engineered by <b>EinfachDev</b></sub>
</p>

<p align="center">
  <a href="#-self-hosting">Self-hosting</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-security">Security</a>
</p>

---

## ✨ Features

**Reader**
- Open **files, whole folders** (drag & drop or picker), **URLs** (GitHub/GitLab/Codeberg/Gist links are converted to raw files) or pasted text
- Folder mode: relative links between `.md` files and relative images just work, like a small docs website
- Table of contents with scroll-spy, reading progress, word count and reading time
- Themes: system / light / dark / sepia; sans / serif / mono font, size and line width
- **Presentation mode** (slides split at `---` or at H1/H2)
- Export: `.md`, standalone `.html`, print/PDF, copy HTML/Markdown
- **Share links**: the document is compressed into the URL fragment (`#md=…`). The fragment is never sent to any server.
- Installable PWA, works offline, opens `.md` files when installed

**Rendering** – GitHub Flavored Markdown, syntax highlighting (highlight.js), math (KaTeX), diagrams (Mermaid, lazy loaded), footnotes, task lists, front matter, GitHub alerts (`> [!NOTE]` …). Everything is sanitized with DOMPurify.

**Editor** – live split preview with synced scrolling, formatting toolbar, shortcuts (`Ctrl+B/I/K/E/H/S`), smart list continuation, tab indenting, autosave in the browser, file drop, export & share.

**Tools**
| Tool | What it does |
| --- | --- |
| Table generator | Visual grid, alignment, transpose, paste from Excel/LibreOffice, import CSV/TSV/Markdown |
| TOC generator | GitHub-compatible anchors, level range, bullet/numbered, `<!-- toc -->` markers, insert into document |
| HTML → Markdown | Paste HTML **or rich text** from websites/Word, GFM tables, configurable style |
| Markdown → HTML | Clean fragment, rich output or complete HTML document |
| Diff | Line or word diff, ignore whitespace |
| Lint & format | Broken anchors, missing alt texts, heading jumps, bare URLs … plus one-click formatter |

UI languages: **English** and **German** – chosen by the visitor's country (or browser language), switchable at any time.

## 🚀 Self-hosting

Requirements: **PHP 8.1+** with the `curl` and `mbstring` extensions. No database, no Composer, no Node.js, no build step.

### Docker (recommended)

```bash
git clone https://github.com/EinfachDevYT/marklight.git
cd marklight
docker compose up -d
# → http://localhost:8080
```

The container runs as `www-data`, with a read-only file system, all capabilities dropped and `no-new-privileges`.

### Any PHP web host (Apache / nginx / shared hosting)

1. Upload the repository.
2. Point the **document root to `public/`**. Only that folder must be reachable from the web.
3. Clean URLs (`/reader`, `/editor`, …) need a rewrite rule. Apache: already included in `public/.htaccess`. nginx: see below.
4. Can't change the document root? The root `.htaccess` routes everything into `public/` and blocks `src/`, `config/` & co. (Apache with `mod_rewrite`).

### nginx + PHP-FPM

Ready-to-use files live in [`docs/`](docs):

| File | Goes to |
| --- | --- |
| [`docs/nginx/marklight.conf`](docs/nginx/marklight.conf) | `/etc/nginx/sites-available/<your-domain>` – vhost with clean URLs, headers, no access log |
| [`docs/php-fpm-pool.conf`](docs/php-fpm-pool.conf) | `/etc/php/<version>/fpm/pool.d/marklight.conf` – dedicated, locked-down PHP pool |
| [`docs/nginx/geoip2.conf`](docs/nginx/geoip2.conf) | `/etc/nginx/conf.d/geoip2.conf` – optional country detection (default language) |

```bash
sudo nginx -t && sudo systemctl reload nginx
```
```bash
sudo certbot --nginx -d marklight.example.org
```

### Country detection (optional)

Used to pick the default language (German for DE/AT/CH/LI/LU, English otherwise). No external service is called – the lookup runs locally.

```bash
sudo apt install libnginx-mod-http-geoip2
```
```bash
sudo sh scripts/update-geoip.sh
```

Then copy `docs/nginx/geoip2.conf`, keep the `GEOIP_COUNTRY_CODE` line in the vhost and set `'geo' => ['source' => 'server_var']`. Run `scripts/update-geoip.sh` monthly (cron). Without GeoIP, the language falls back to the browser's `Accept-Language`.

### Try locally

```bash
php -S localhost:8080 -t public scripts/dev-router.php
```

### Configuration

Defaults live in `config/config.php`. Override them in `config/config.local.php` (git-ignored – never commit personal data):

```php
<?php
return [
    'base_url' => 'https://marklight.example.org',

    // Legal pages /impressum and /datenschutz (required for sites run from Germany)
    'legal' => [
        'name'    => 'Your Name',
        'street'  => 'Street 1',
        'city'    => '12345 City',
        'email'   => 'mail@example.org',
        // or link an existing Impressum instead of name/address:
        // 'imprint_url' => 'https://example.org/impressum',
    ],

    // Country detection for the default language: 'none' | 'server_var' (nginx GeoIP2) | 'cloudflare'
    'geo' => ['source' => 'server_var'],

    'fetch' => [
        'enabled'       => true,               // false = disable "Open from URL" completely
        'allowed_hosts' => ['raw.githubusercontent.com', 'docs.example.org'],
        // 'allowed_hosts' => ['*'],           // any PUBLIC host (internal networks stay blocked)
    ],
];
```

## 🔒 Security

Marklight is designed so that there is **nothing to leak**:

- **No database, no accounts, no cookies, no sessions, no analytics.** The server never receives or stores documents. Opening files, editing, converting and sharing all happen in the browser; drafts live only in the user's `localStorage`.
- **No access logs** in the Docker image. The rate limiter stores only an HMAC hash of the client IP for one time window.
- **XSS protection:** all rendered Markdown and HTML is sanitized with DOMPurify. KaTeX runs with `trust: false`, Mermaid with `securityLevel: 'strict'`.
- **Strict Content-Security-Policy:** scripts only from the own origin, **no inline JavaScript**, `connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'none'`. Plus `nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options`, COOP/CORP, Permissions-Policy, and HSTS over HTTPS.
- **No CDNs:** all libraries are bundled in `public/vendor/`, so there are no third-party requests and no supply-chain surprises at runtime.
- **SSRF-hardened URL loader (`api/fetch.php`)**:
  - https only, default ports only, no credentials in URLs
  - host allow-list (default: GitHub, GitLab, Codeberg, Bitbucket, SourceHut)
  - DNS is resolved by Marklight itself and **every** address must be public: loopback, private, link-local (cloud metadata `169.254.169.254`), CGNAT, multicast, reserved, NAT64/6to4/IPv4-mapped ranges are all blocked
  - the checked IP is pinned for the connection (`CURLOPT_RESOLVE`), so **DNS rebinding** does not work; the used IP is checked again afterwards
  - redirects are followed manually and every hop is validated again
  - size limit (2 MB), timeouts, binary content rejected, response always served as `text/plain` with `nosniff` and `sandbox` CSP
  - environment proxies are ignored, TLS certificates are verified
  - only usable from Marklight's own front-end (custom header + `Sec-Fetch-Site`), rate limited per client
- **Hardened runtime:** only `public/` is web-reachable, PHP runs with `allow_url_fopen=Off`, `expose_php=Off`, dangerous functions disabled, `open_basedir`.

Run the security test suite:

```bash
php tests/run.php
```

Found a vulnerability? Please see [SECURITY.md](SECURITY.md).

## 🧩 Project structure

```
public/            ← document root (the only web-reachable folder)
  index.php        landing page            → /
  reader.php       reader                  → /reader
  editor.php       editor                  → /editor
  tools.php        tools                   → /tools
  impressum.php    legal notice            → /impressum
  datenschutz.php  privacy policy          → /datenschutz
  api/fetch.php    SSRF-hardened URL loader
  assets/          CSS, JS, icons, demo documents
  vendor/          bundled third-party libraries
src/               PHP: bootstrap (headers, language, geo), layout, UrlFetcher, RateLimiter
docs/              nginx vhost, GeoIP2 and PHP-FPM pool examples
config/            configuration (config.local.php overrides)
docker/            Apache vhost & hardened php.ini
tests/             security tests
```

Update the bundled libraries: `npm install && npm run vendor`.

## 📄 License

[GPL-3.0-or-later](LICENSE) · Third-party libraries in `public/vendor/` keep their own licenses (MIT / BSD / Apache-2.0 / MPL-2.0, see the license files next to them).

<p align="center"><sub>Marklight · engineered by <b>EinfachDev</b></sub></p>
