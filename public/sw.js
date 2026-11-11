/* Marklight service worker – offline support. Engineered by EinfachDev.
   Strategy: pages = network first (fallback cache), static assets = cache first.
   The API (api/*) and anything cross-origin is never cached. */
const VERSION = 'marklight-v1.0.0';
const CORE = [
  './', 'index.php', 'reader.php', 'editor.php', 'tools.php',
  'assets/css/app.css', 'assets/js/i18n.js', 'assets/js/icons.js', 'assets/js/core.js',
  'assets/js/reader.js', 'assets/js/editor.js', 'assets/js/tools.js', 'assets/img/logo.svg',
  'assets/demo-en.md', 'assets/demo-de.md', 'manifest.webmanifest',
  'vendor/marked/marked.umd.js', 'vendor/dompurify/purify.min.js', 'vendor/highlight/highlight.min.js',
  'vendor/katex/katex.min.js', 'vendor/katex/katex.min.css',
  'vendor/turndown/turndown.browser.umd.js', 'vendor/turndown/turndown-plugin-gfm.js', 'vendor/diff/diff.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(url.pathname, copy)); }
          return res;
        })
        .catch(() => caches.match(url.pathname, { ignoreSearch: true }).then((r) => r || caches.match('reader.php')))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
