/* ==========================================================================
   Marklight core – settings, theming, i18n glue, UI helpers and the
   Markdown render pipeline shared by reader, editor and tools.
   Engineered by EinfachDev · GPL-3.0-or-later
   ========================================================================== */
(function () {
  'use strict';
  const ML = (window.Marklight = window.Marklight || {});
  ML.version = '1.0.0';

  /* ---------- Storage ---------- */
  const PREFIX = 'marklight:';
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    del(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ } },
  };
  ML.store = store;

  /* ---------- Settings ---------- */
  const DEFAULTS = { theme: 'dark', lang: null, font: 'sans', size: 17, width: 760, math: true, mermaid: true };
  const settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
  ML.settings = settings;
  const listeners = [];
  ML.onSettings = (fn) => listeners.push(fn);
  ML.setSetting = (key, value) => {
    settings[key] = value;
    store.set('settings', settings);
    applySettings();
    listeners.forEach((fn) => fn(key, value));
  };

  function resolvedTheme() {
    if (settings.theme !== 'auto') return settings.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  ML.resolvedTheme = resolvedTheme;

  function applySettings() {
    const root = document.documentElement;
    if (settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    const fonts = { sans: 'var(--font-ui)', serif: 'var(--font-serif)', mono: 'var(--font-mono)' };
    root.style.setProperty('--reader-font', fonts[settings.font] || fonts.sans);
    root.style.setProperty('--reader-size', settings.size + 'px');
    root.style.setProperty('--reader-width', settings.width + 'px');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', { dark: '#0d0b14', sepia: '#f4ecd8' }[resolvedTheme()] || '#fbf9ff');
  }
  applySettings(); // runs in <head> → no flash of the wrong theme
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (settings.theme === 'auto') { applySettings(); listeners.forEach((fn) => fn('theme', 'auto')); }
    });
  }

  /* ---------- i18n ---------- */
  const I18N = window.MarklightI18n || { en: {}, de: {} };
  function detectLang() {
    if (settings.lang && I18N[settings.lang]) return settings.lang; // explicit user choice
    // Server-side default (visitor's country / Accept-Language), see src/bootstrap.php
    const srv = document.documentElement.getAttribute('data-default-lang');
    if (srv && I18N[srv]) return srv;
    const nav = (navigator.languages || [navigator.language || 'en']).map((l) => String(l).slice(0, 2).toLowerCase());
    return nav.find((l) => I18N[l]) || 'en';
  }
  ML.lang = detectLang();
  document.documentElement.lang = ML.lang;
  ML.t = function (key, vars) {
    let s = (I18N[ML.lang] && I18N[ML.lang][key]) || I18N.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return s;
  };
  ML.applyI18n = function (root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = ML.t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = ML.t(el.dataset.i18nHtml); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = ML.t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const v = ML.t(el.dataset.i18nTitle);
      el.title = v;
      el.setAttribute('aria-label', v);
    });
    if (document.body && document.body.dataset.titleKey) document.title = ML.t(document.body.dataset.titleKey) + ' · Marklight';
  };

  /* ---------- Small utils ---------- */
  /* Public config injected by PHP (data-config on <body>) - read lazily. */
  Object.defineProperty(ML, 'config', {
    get() {
      try { return JSON.parse((document.body && document.body.dataset.config) || '{}'); } catch (e) { return {}; }
    },
  });
  ML.$ = (sel, root) => (root || document).querySelector(sel);
  ML.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  ML.escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ML.debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(this, a), ms); }; };
  ML.download = function (filename, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  ML.copy = async function (text, msgKey) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
    }
    ML.toast(ML.t(msgKey || 'toast.copied'));
  };
  ML.readFile = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
  ML.isMarkdownName = (name) => /\.(md|markdown|mdown|mkd|mkdn|mdx|txt)$/i.test(name || '');
  ML.baseName = (name) => String(name || 'document').replace(/\.[^.]+$/, '') || 'document';
  ML.formatDate = (ts) => {
    try { return new Intl.DateTimeFormat(ML.lang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts)); } catch (e) { return new Date(ts).toLocaleString(); }
  };
  ML.formatNumber = (n) => { try { return new Intl.NumberFormat(ML.lang).format(n); } catch (e) { return String(n); } };

  /** Plain-text statistics for a Markdown string. */
  ML.stats = function (md) {
    const text = String(md || '')
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[#>*_~|\-=]+/g, ' ');
    const words = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
    const chars = String(md || '').length;
    const lines = md ? String(md).split('\n').length : 0;
    const minutes = Math.max(1, Math.round(words / 220));
    return { words, chars, lines, minutes };
  };

  /* ---------- Toast & modal ---------- */
  ML.toast = function (msg, type) {
    let host = document.querySelector('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' error' : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 5000 : 2600);
  };

  /**
   * Minimal modal. opts: { title, text, input: {placeholder, value, multiline}, ok, cancel }
   * Resolves with the input value (or true) on OK and null on cancel.
   */
  ML.modal = function (opts) {
    return new Promise((resolve) => {
      const bd = document.createElement('div');
      bd.className = 'modal-backdrop';
      const m = document.createElement('div');
      m.className = 'modal';
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      const h = document.createElement('h3'); h.textContent = opts.title || ''; m.appendChild(h);
      if (opts.text) { const p = document.createElement('p'); p.textContent = opts.text; m.appendChild(p); }
      let field = null;
      if (opts.input) {
        field = document.createElement(opts.input.multiline ? 'textarea' : 'input');
        field.className = opts.input.multiline ? 'textarea' : 'input';
        if (!opts.input.multiline) field.type = opts.input.type || 'text';
        field.placeholder = opts.input.placeholder || '';
        field.value = opts.input.value || '';
        if (opts.input.readonly) field.readOnly = true;
        m.appendChild(field);
      }
      const actions = document.createElement('div'); actions.className = 'actions';
      const close = (val) => { bd.remove(); document.removeEventListener('keydown', onKey); resolve(val); };
      if (opts.cancel !== false) {
        const c = document.createElement('button'); c.className = 'btn'; c.textContent = opts.cancel || ML.t('common.cancel');
        c.onclick = () => close(null); actions.appendChild(c);
      }
      if (opts.extra) {
        const x = document.createElement('button'); x.className = 'btn'; x.textContent = opts.extra.label;
        x.onclick = () => opts.extra.onClick(field ? field.value : null); actions.appendChild(x);
      }
      const ok = document.createElement('button'); ok.className = 'btn btn-primary'; ok.textContent = opts.ok || ML.t('common.ok');
      ok.onclick = () => close(field ? field.value : true); actions.appendChild(ok);
      m.appendChild(actions);
      bd.appendChild(m);
      bd.addEventListener('mousedown', (e) => { if (e.target === bd) close(null); });
      const onKey = (e) => {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter' && field && !opts.input.multiline) { e.preventDefault(); close(field.value); }
      };
      document.addEventListener('keydown', onKey);
      document.body.appendChild(bd);
      (field || ok).focus();
      if (field && opts.input.readonly) field.select();
    });
  };

  /* ---------- Share links (compressed into the URL hash, never sent to a server) ---------- */
  function b64urlEncode(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(str) {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  ML.encodeShare = async function (text) {
    const raw = new TextEncoder().encode(text);
    if (typeof CompressionStream === 'function') {
      const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const buf = new Uint8Array(await new Response(stream).arrayBuffer());
      return 'z' + b64urlEncode(buf);
    }
    return 'p' + b64urlEncode(raw);
  };
  ML.decodeShare = async function (data) {
    const kind = data[0];
    const bytes = b64urlDecode(data.slice(1));
    if (kind === 'z') {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new TextDecoder().decode(await new Response(stream).arrayBuffer());
    }
    return new TextDecoder().decode(bytes);
  };
  ML.shareLink = async function (text, page) {
    const data = await ML.encodeShare(text);
    const url = new URL(page || 'reader', location.href);
    url.search = '';
    url.hash = 'md=' + data;
    const link = url.toString();
    const ok = await ML.modal({
      title: ML.t('share.title'),
      text: ML.t('share.text', { size: ML.formatNumber(link.length) }) + (link.length > 8000 ? ' ' + ML.t('share.long') : ''),
      input: { value: link, readonly: true },
      ok: ML.t('share.copy'),
    });
    if (ok !== null) ML.copy(link, 'toast.linkCopied');
  };

  /* ==========================================================================
     Markdown rendering
     ========================================================================== */
  const ALERT_ICONS = { note: 'info', tip: 'lightbulb', important: 'message', warning: 'alert-triangle', caution: 'alert-octagon' };
  ML.slugify = function (text) {
    return String(text).trim().toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
      .replace(/\s/g, '-');
  };
  ML.makeSlugger = function () {
    const seen = new Map();
    return (text) => {
      const base = ML.slugify(text) || 'section';
      if (!seen.has(base)) { seen.set(base, 0); return base; }
      let n = seen.get(base);
      let slug;
      do { n++; slug = base + '-' + n; } while (seen.has(slug));
      seen.set(base, n);
      seen.set(slug, 0);
      return slug;
    };
  };
  function decodeEntities(s) {
    return s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|#39|nbsp);/gi, (m, e) => {
      const map = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
      if (map[e.toLowerCase()] !== undefined) return map[e.toLowerCase()];
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return m;
    });
  }
  ML.htmlToText = (html) => decodeEntities(String(html).replace(/<[^>]*>/g, '')).trim();

  /** Splits YAML-ish front matter from the document. */
  ML.splitFrontMatter = function (md) {
    const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(md);
    if (!m) return { front: null, body: md };
    const front = [];
    m[1].split(/\r?\n/).forEach((line) => {
      const kv = /^([\w.-]+)\s*:\s*(.*)$/.exec(line);
      if (kv) front.push([kv[1], kv[2].replace(/^["']|["']$/g, '')]);
      else if (front.length && line.trim()) front[front.length - 1][1] += ' ' + line.trim();
    });
    return { front, raw: m[1], body: md.slice(m[0].length) };
  };

  let parser = null;
  let state = null; // per-render state (headings, footnotes, slugger)

  function getParser() {
    if (parser) return parser;
    if (!window.marked) throw new Error('marked not loaded');
    parser = new window.marked.Marked({ gfm: true, breaks: false });
    parser.use({
      extensions: [
        {
          name: 'mathBlock',
          level: 'block',
          start(src) { const m = /^\$\$/m.exec(src); return m ? m.index : undefined; },
          tokenizer(src) {
            if (!settings.math) return undefined;
            const m = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/.exec(src);
            if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
            return undefined;
          },
          renderer(tok) { return '<div class="math-block" data-tex="' + ML.escapeHtml(tok.text) + '"></div>\n'; },
        },
        {
          name: 'mathInline',
          level: 'inline',
          start(src) { const i = src.indexOf('$'); return i < 0 ? undefined : i; },
          tokenizer(src) {
            if (!settings.math) return undefined;
            let m = /^\$\$((?:\\.|[^\\$])+?)\$\$/.exec(src);
            if (m) return { type: 'mathInline', raw: m[0], text: m[1].trim(), display: true };
            m = /^\$(?![\s$])((?:\\.|[^\\$\n])+?)(?<![\s\\])\$(?![\d$])/.exec(src);
            if (m) return { type: 'mathInline', raw: m[0], text: m[1], display: false };
            return undefined;
          },
          renderer(tok) {
            return '<span class="math-inline' + (tok.display ? ' math-display' : '') + '" data-tex="' + ML.escapeHtml(tok.text) + '"></span>';
          },
        },
        {
          name: 'footnoteDef',
          level: 'block',
          start(src) { const m = /^\[\^[^\]\s]+\]:/m.exec(src); return m ? m.index : undefined; },
          tokenizer(src) {
            const m = /^\[\^([^\]\s]+)\]:[ \t]+([^\n]*(?:\n(?: {2,}|\t)[^\n]*)*)(?:\n+|$)/.exec(src);
            if (!m) return undefined;
            if (state) state.footDefs.set(m[1], m[2].replace(/\n(?: {2,}|\t)/g, '\n'));
            return { type: 'footnoteDef', raw: m[0] };
          },
          renderer() { return ''; },
        },
        {
          name: 'footnoteRef',
          level: 'inline',
          start(src) { const i = src.indexOf('[^'); return i < 0 ? undefined : i; },
          tokenizer(src) {
            const m = /^\[\^([^\]\s]+)\]/.exec(src);
            if (m) return { type: 'footnoteRef', raw: m[0], id: m[1] };
            return undefined;
          },
          renderer(tok) {
            if (!state) return '';
            let n = state.footOrder.indexOf(tok.id);
            if (n < 0) { state.footOrder.push(tok.id); n = state.footOrder.length - 1; }
            const id = ML.slugify(tok.id) || String(n + 1);
            return '<sup class="fn"><a href="#fn-' + id + '" id="user-content-fnref-' + id + '">' + (n + 1) + '</a></sup>';
          },
        },
      ],
      renderer: {
        heading(tok) {
          const inner = this.parser.parseInline(tok.tokens);
          const text = ML.htmlToText(inner);
          const slug = state ? state.slug(text) : ML.slugify(text);
          if (state) state.headings.push({ level: tok.depth, text, slug });
          return '<h' + tok.depth + ' id="user-content-' + slug + '"><a class="anchor" href="#' + slug + '" aria-hidden="true" tabindex="-1">#</a>' +
            inner + '</h' + tok.depth + '>\n';
        },
        code(tok) {
          const lang = String(tok.lang || '').trim().split(/\s+/)[0].toLowerCase();
          const text = tok.text.replace(/\n$/, '');
          if (lang === 'mermaid' && settings.mermaid) {
            return '<pre class="mermaid-src" data-mermaid="1">' + ML.escapeHtml(text) + '</pre>\n';
          }
          let body = ML.escapeHtml(text);
          let label = lang;
          if (window.hljs && lang && window.hljs.getLanguage(lang)) {
            try { body = window.hljs.highlight(text, { language: lang, ignoreIllegals: true }).value; } catch (e) { /* keep plain */ }
          }
          return '<div class="code-block"><div class="code-head"><span>' + ML.escapeHtml(label || 'text') + '</span><button type="button" data-copy-code>' +
            ML.escapeHtml(ML.t('render.copy')) + '</button></div><pre><code class="hljs' + (lang ? ' language-' + ML.escapeHtml(lang) : '') + '">' +
            body + '</code></pre></div>\n';
        },
      },
    });
    return parser;
  }

  /**
   * Markdown → sanitized HTML string.
   * Returns { html, headings, front, stats }
   */
  ML.toHtml = function (md, opts) {
    opts = opts || {};
    const src = String(md || '').replace(/\r\n?/g, '\n');
    const { front, body } = opts.frontMatter === false ? { front: null, body: src } : ML.splitFrontMatter(src);
    state = { headings: [], footDefs: new Map(), footOrder: [], slug: ML.makeSlugger() };
    let html;
    let headings = [];
    try {
      html = getParser().parse(body);
      if (state.footOrder.length) {
        html += '<section class="footnotes"><ol>';
        state.footOrder.forEach((id, i) => {
          const sid = ML.slugify(id) || String(i + 1);
          const def = state.footDefs.get(id);
          html += '<li id="user-content-fn-' + sid + '">' + (def ? getParser().parseInline(def) : '<em>?</em>') +
            ' <a href="#fnref-' + sid + '" aria-label="Back">↩</a></li>';
        });
        html += '</ol></section>';
      }
    } finally {
      headings = state.headings;
      state = null;
    }
    if (front && front.length && opts.showFrontMatter !== false) {
      let t = '<details class="frontmatter"><summary>' + ML.escapeHtml(ML.t('render.frontmatter')) + '</summary><table><tbody>';
      front.forEach(([k, v]) => { t += '<tr><th>' + ML.escapeHtml(k) + '</th><td>' + ML.escapeHtml(v) + '</td></tr>'; });
      html = t + '</tbody></table></details>\n' + html;
    }
    const clean = window.DOMPurify
      ? window.DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'data-tex', 'data-copy-code', 'data-mermaid'], FORBID_TAGS: ['style'] })
      : ML.escapeHtml(html);
    return { html: clean, headings, front, stats: ML.stats(body) };
  };

  /* ---------- Post-render enhancement ---------- */
  function enhanceAlerts(root) {
    root.querySelectorAll('blockquote').forEach((bq) => {
      const p = bq.firstElementChild;
      if (!p || p.tagName !== 'P') return;
      const first = p.firstChild;
      if (!first || first.nodeType !== 3) return;
      const m = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i.exec(first.nodeValue);
      if (!m) return;
      const kind = m[1].toLowerCase();
      first.nodeValue = first.nodeValue.slice(m[0].length);
      if (p.firstChild && p.firstChild.nodeName === 'BR') p.firstChild.remove();
      if (!p.textContent.trim() && !p.querySelector('img')) p.remove();
      bq.classList.add('alert', 'alert-' + kind);
      const title = document.createElement('div');
      title.className = 'alert-title';
      title.innerHTML = ML.icon(ALERT_ICONS[kind]);
      title.appendChild(document.createTextNode(ML.t('alert.' + kind)));
      bq.prepend(title);
    });
  }

  function renderMath(root) {
    const nodes = root.querySelectorAll('[data-tex]');
    if (!nodes.length || !window.katex) return;
    nodes.forEach((el) => {
      const display = el.classList.contains('math-block') || el.classList.contains('math-display');
      try {
        window.katex.render(el.getAttribute('data-tex'), el, { displayMode: display, throwOnError: false, trust: false, strict: 'ignore', output: 'htmlAndMathml' });
      } catch (e) {
        el.textContent = el.getAttribute('data-tex');
        el.classList.add('math-error');
      }
    });
  }

  let mermaidLoading = null;
  let mermaidCounter = 0;
  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (!mermaidLoading) {
      mermaidLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = (ML.basePath || '') + 'vendor/mermaid/mermaid.min.js';
        s.onload = () => resolve(window.mermaid);
        s.onerror = () => { mermaidLoading = null; reject(new Error('mermaid failed to load')); };
        document.head.appendChild(s);
      });
    }
    return mermaidLoading;
  }
  async function renderMermaid(root) {
    const nodes = Array.from(root.querySelectorAll('pre[data-mermaid]'));
    if (!nodes.length) return;
    let mermaid;
    try { mermaid = await loadMermaid(); } catch (e) { return; }
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: resolvedTheme() === 'dark' ? 'dark' : 'default', fontFamily: 'inherit' });
    for (const pre of nodes) {
      if (!pre.isConnected) continue;
      const code = pre.textContent;
      const id = 'ml-mermaid-' + (++mermaidCounter);
      try {
        const { svg } = await mermaid.render(id, code);
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.innerHTML = window.DOMPurify ? window.DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true, html: true }, ADD_TAGS: ['foreignObject'] }) : svg;
        pre.replaceWith(div);
      } catch (e) {
        pre.classList.add('math-error');
        pre.removeAttribute('data-mermaid');
        const tmp = document.getElementById('d' + id);
        if (tmp) tmp.remove();
      }
    }
  }

  function scrollToAnchor(root, hash) {
    let id = decodeURIComponent(hash.replace(/^#/, ''));
    const el = root.querySelector('[id="user-content-' + CSS.escape(id) + '"]') || root.querySelector('[id="' + CSS.escape(id) + '"]');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
    return false;
  }
  ML.scrollToAnchor = scrollToAnchor;

  /**
   * Renders Markdown into an element and wires up all interactive bits.
   * opts: { resolveUrl(url, kind) → string|null, onLink(href, event) → bool, frontMatter }
   */
  ML.render = function (md, target, opts) {
    opts = opts || {};
    const result = ML.toHtml(md, opts);
    target.innerHTML = result.html;
    enhanceAlerts(target);
    if (opts.resolveUrl) {
      target.querySelectorAll('img[src]').forEach((img) => {
        const r = opts.resolveUrl(img.getAttribute('src'), 'image');
        if (r) img.src = r;
      });
    }
    target.querySelectorAll('img').forEach((img) => { img.loading = 'lazy'; img.decoding = 'async'; });
    target.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (/^(https?:)?\/\//i.test(href)) a.target = '_blank';
      if (a.target) a.rel = 'noopener noreferrer';
    });
    if (settings.math) renderMath(target);
    if (settings.mermaid) renderMermaid(target);
    if (!target.dataset.mlWired) {
      target.dataset.mlWired = '1';
      target.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-copy-code]');
        if (btn) {
          const code = btn.closest('.code-block').querySelector('code');
          ML.copy(code ? code.innerText : '', 'toast.codeCopied');
          return;
        }
        const a = e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (href.startsWith('#')) {
          e.preventDefault();
          scrollToAnchor(target, href);
          return;
        }
        if (target._mlOnLink && target._mlOnLink(href, e)) e.preventDefault();
      });
    }
    target._mlOnLink = opts.onLink || null;
    return result;
  };

  /** Standalone HTML document for export. */
  ML.exportHtml = function (md, title) {
    const { html } = ML.toHtml(md);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    enhanceAlerts(tmp);
    if (settings.math) renderMath(tmp);
    tmp.querySelectorAll('[data-copy-code]').forEach((b) => b.remove());
    const css = Array.from(document.styleSheets).map((sheet) => {
      try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; }
    }).join('\n');
    return '<!doctype html>\n<html lang="' + ML.lang + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<meta name="generator" content="Marklight – engineered by EinfachDev">\n<title>' + ML.escapeHtml(title || 'Document') + '</title>\n<style>\n' + css +
      '\nbody{display:block;padding:40px 20px}.markdown-body{max-width:var(--reader-width);margin:0 auto}\n</style>\n</head>\n<body>\n<article class="markdown-body">\n' +
      tmp.innerHTML + '\n</article>\n</body>\n</html>\n';
  };

  /* ---------- Menus ---------- */
  function closeMenus(except) {
    document.querySelectorAll('.menu').forEach((m) => {
      if (m !== except && !m.hidden) {
        m.hidden = true;
        const b = m.parentElement.querySelector('[data-menu]');
        if (b) b.setAttribute('aria-expanded', 'false');
      }
    });
  }
  ML.closeMenus = closeMenus;
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-menu]');
    if (trigger) {
      const menu = document.getElementById(trigger.dataset.menu);
      if (menu) {
        const open = menu.hidden;
        closeMenus(menu);
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
      }
      return;
    }
    const inMenu = e.target.closest('.menu');
    if (!inMenu) closeMenus();
    else if (e.target.closest('.menu button, .menu a') && !inMenu.classList.contains('panel-settings')) closeMenus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  /* ---------- Header wiring ---------- */
  const THEMES = ['auto', 'light', 'dark', 'sepia'];
  const THEME_ICON = { auto: 'contrast', light: 'sun', dark: 'moon', sepia: 'coffee' };
  function updateHeader() {
    const tb = document.getElementById('themeBtn');
    if (tb) {
      tb.innerHTML = ML.icon(THEME_ICON[settings.theme]);
      const label = ML.t('theme.label') + ': ' + ML.t('theme.' + settings.theme);
      tb.title = label; tb.setAttribute('aria-label', label);
    }
    const lb = document.getElementById('langBtn');
    if (lb) { lb.querySelector('span').textContent = ML.lang.toUpperCase(); }
    document.querySelectorAll('.swatch[data-v]').forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.v === settings.theme)));
  }
  ML.updateHeader = updateHeader;

  document.addEventListener('DOMContentLoaded', () => {
    ML.hydrateIcons();
    ML.applyI18n();
    updateHeader();
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      ML.setSetting('theme', THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length]);
      updateHeader();
      ML.toast(ML.t('theme.label') + ': ' + ML.t('theme.' + settings.theme));
    });
    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.addEventListener('click', () => {
      ML.lang = ML.lang === 'de' ? 'en' : 'de';
      document.documentElement.lang = ML.lang;
      ML.setSetting('lang', ML.lang);
      ML.applyI18n();
      updateHeader();
      document.dispatchEvent(new CustomEvent('marklight:lang'));
    });
    const navToggle = document.getElementById('navToggle');
    if (navToggle) navToggle.addEventListener('click', () => {
      const nav = document.querySelector('.main-nav');
      nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(nav.classList.contains('open')));
    });
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  });

  /* ---------- Offline support ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
