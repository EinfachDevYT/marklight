/* Marklight – Reader. Engineered by EinfachDev · GPL-3.0-or-later */
(function () {
  'use strict';
  const ML = window.Marklight;
  const { $, $$, t, store } = ML;

  const els = {
    layout: $('#layout'), toc: $('#toc'), tocEmpty: $('#tocEmpty'), fileList: $('#fileList'), filesEmpty: $('#filesEmpty'),
    docMeta: $('#docMeta'), title: $('#docTitle'), scroller: $('#scroller'), dropzone: $('#dropzone'), content: $('#content'),
    progress: $('#progress'), fileInput: $('#fileInput'), folderInput: $('#folderInput'), recent: $('#recent'), recentList: $('#recentList'),
  };

  /** Current workspace */
  let docs = [];          // [{ name, path, content, source, url }]
  let current = -1;
  let assets = new Map(); // folder mode: normalized path → File
  const objectUrls = new Map();
  let headings = [];

  /* ---------- Path helpers ---------- */
  function normalize(path) {
    const out = [];
    path.split('/').forEach((seg) => {
      if (!seg || seg === '.') return;
      if (seg === '..') out.pop(); else out.push(seg);
    });
    return out.join('/');
  }
  const dirname = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
  const isExternal = (u) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(u);

  function resolveUrl(src, kind) {
    const doc = docs[current];
    if (!doc || !src || src.startsWith('#') || /^(data|blob):/i.test(src)) return null;
    if (doc.source === 'folder' && !isExternal(src)) {
      const clean = decodeURI(src.split(/[?#]/)[0]);
      const path = clean.startsWith('/') ? normalize(clean) : normalize(dirname(doc.path) + clean);
      const file = assets.get(path);
      if (!file) return null;
      if (kind === 'image') {
        if (!objectUrls.has(path)) objectUrls.set(path, URL.createObjectURL(file));
        return objectUrls.get(path);
      }
      return path;
    }
    if (doc.url && !isExternal(src)) {
      try { return new URL(src, doc.url).toString(); } catch (e) { return null; }
    }
    return null;
  }

  function onLink(href) {
    const doc = docs[current];
    if (!doc || isExternal(href) && !/^https?:/i.test(href)) return false;
    const [pathPart, hash] = href.split('#');
    if (doc.source === 'folder' && !isExternal(href)) {
      const path = normalize((pathPart.startsWith('/') ? '' : dirname(doc.path)) + decodeURI(pathPart));
      const idx = docs.findIndex((d) => d.path === path);
      if (idx >= 0) { show(idx, hash); return true; }
      const file = assets.get(path);
      if (file) {
        // Only open passive formats inline; anything else (e.g. .html, .svg) is downloaded so it
        // can never run inside Marklight's origin.
        if (/^(image\/(png|jpe?g|gif|webp|avif)|application\/pdf|text\/plain)$/.test(file.type)) {
          const u = URL.createObjectURL(file);
          window.open(u, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(u), 60000);
        } else ML.download(file.name, file);
        return true;
      }
      ML.toast(t('reader.linkMissing', { path }), 'error');
      return true;
    }
    if (doc.url && !isExternal(href) && ML.isMarkdownName(pathPart)) {
      loadUrl(new URL(href, doc.url).toString());
      return true;
    }
    return false;
  }

  /* ---------- Rendering ---------- */
  function renderCurrent(hash) {
    const doc = docs[current];
    if (!doc) return;
    els.dropzone.hidden = true;
    els.content.hidden = false;
    const res = ML.render(doc.content, els.content, { resolveUrl, onLink });
    headings = res.headings;
    buildToc();
    els.title.textContent = doc.name;
    document.title = (res.front && (res.front.find(([k]) => k === 'title') || [])[1]) || doc.name + ' · Marklight';
    els.docMeta.hidden = false;
    els.docMeta.innerHTML = '';
    [
      t('stats.words', { n: ML.formatNumber(res.stats.words) }),
      t('stats.reading', { n: res.stats.minutes }),
      t('stats.lines', { n: ML.formatNumber(res.stats.lines) }),
    ].forEach((s) => { const d = document.createElement('div'); d.textContent = s; els.docMeta.appendChild(d); });
    highlightFileList();
    if (hash) setTimeout(() => ML.scrollToAnchor(els.content, '#' + hash), 30);
    updateProgress();
  }

  function show(idx, hash) {
    if (idx < 0 || idx >= docs.length) return;
    current = idx;
    els.scroller.scrollTop = 0;
    renderCurrent(hash);
    if (window.matchMedia('(max-width: 900px)').matches) els.layout.classList.remove('mobile-open');
  }

  function buildToc() {
    els.toc.innerHTML = '';
    const minLevel = headings.reduce((m, h) => Math.min(m, h.level), 6);
    headings.forEach((h) => {
      const li = document.createElement('li');
      li.className = 'l' + (h.level - minLevel + 1);
      const a = document.createElement('a');
      a.href = '#' + h.slug;
      a.textContent = h.text;
      a.dataset.slug = h.slug;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        ML.scrollToAnchor(els.content, '#' + h.slug);
        if (window.matchMedia('(max-width: 900px)').matches) els.layout.classList.remove('mobile-open');
      });
      li.appendChild(a);
      els.toc.appendChild(li);
    });
    els.tocEmpty.hidden = headings.length > 0;
    updateScrollSpy();
  }

  function buildFileList() {
    els.fileList.innerHTML = '';
    docs.forEach((d, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = ML.icon('file-text');
      const s = document.createElement('span');
      s.className = 'path';
      s.textContent = d.path || d.name;
      s.title = d.path || d.name;
      b.appendChild(s);
      b.addEventListener('click', () => show(i));
      li.appendChild(b);
      els.fileList.appendChild(li);
    });
    els.filesEmpty.hidden = docs.length > 1;
    if (docs.length > 1) selectTab('files');
  }
  function highlightFileList() {
    $$('button', els.fileList).forEach((b, i) => b.classList.toggle('active', i === current));
  }

  /* ---------- Scroll spy & progress ---------- */
  let ticking = false;
  function updateProgress() {
    const s = els.scroller;
    const max = s.scrollHeight - s.clientHeight;
    els.progress.style.width = (max > 0 ? Math.min(100, (s.scrollTop / max) * 100) : 0) + '%';
  }
  function updateScrollSpy() {
    if (!headings.length) return;
    const top = els.scroller.getBoundingClientRect().top + 90;
    let active = null;
    for (const h of headings) {
      const el = document.getElementById('user-content-' + h.slug);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= top) active = h.slug; else break;
    }
    if (!active) active = headings[0].slug;
    $$('a', els.toc).forEach((a) => {
      const on = a.dataset.slug === active;
      if (on && !a.classList.contains('active')) a.scrollIntoView({ block: 'nearest' });
      a.classList.toggle('active', on);
    });
  }
  els.scroller.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateProgress(); updateScrollSpy(); ticking = false; });
  }, { passive: true });

  /* ---------- Loading ---------- */
  function resetWorkspace() {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.clear();
    assets = new Map();
    docs = [];
    current = -1;
  }

  function openDocs(list, opts) {
    resetWorkspace();
    docs = list.sort((a, b) => (a.path || a.name).localeCompare(b.path || b.name, undefined, { numeric: true }));
    if (opts && opts.assets) assets = opts.assets;
    buildFileList();
    if (!docs.length) { ML.toast(t('reader.noMarkdown'), 'error'); closeDoc(); return; }
    // Prefer README / index as entry point
    let start = docs.findIndex((d) => /(^|\/)(readme|index)\.(md|markdown)$/i.test(d.path || d.name) && !(d.path || '').slice(0, -(d.name.length)).includes('/'));
    if (start < 0) start = docs.findIndex((d) => /(^|\/)(readme|index)\.(md|markdown)$/i.test(d.path || d.name));
    show(start < 0 ? 0 : start);
    if (docs.length === 1) addRecent(docs[0]);
  }

  async function openFiles(files) {
    const md = files.filter((f) => ML.isMarkdownName(f.name));
    const list = [];
    for (const f of md) list.push({ name: f.name, path: f.name, content: await ML.readFile(f), source: 'file' });
    openDocs(list);
  }

  async function openFolderFiles(entries) {
    // entries: [{ path, file }]
    const assetMap = new Map();
    const list = [];
    const root = entries.length && entries.every((e) => e.path.includes('/')) ? entries[0].path.split('/')[0] + '/' : '';
    for (const { path, file } of entries) {
      const rel = normalize(root && path.startsWith(root) ? path.slice(root.length) : path);
      if (/(^|\/)(node_modules|\.git)(\/|$)/.test(rel)) continue;
      assetMap.set(rel, file);
      if (ML.isMarkdownName(file.name) && !/\.txt$/i.test(file.name)) {
        list.push({ name: file.name, path: rel, content: await ML.readFile(file), source: 'folder' });
      }
    }
    openDocs(list, { assets: assetMap });
    if (list.length) ML.toast(t('reader.folderLoaded', { n: list.length }));
  }

  function rawUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname === 'github.com') {
        const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/);
        if (m) return 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/' + m[3];
        const repo = u.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
        if (repo) return 'https://raw.githubusercontent.com/' + repo[1] + '/' + repo[2] + '/HEAD/README.md';
      }
      if (u.hostname === 'gitlab.com' && u.pathname.includes('/-/blob/')) return url.replace('/-/blob/', '/-/raw/');
      if (u.hostname === 'gist.github.com' && !u.pathname.endsWith('/raw')) return url.replace(/\/?$/, '/raw');
      return url;
    } catch (e) { return url; }
  }

  const CFG = ML.config;

  async function loadUrl(url) {
    if (!CFG.fetch) { ML.toast(t('fetch.disabled'), 'error'); return; }
    const target = rawUrl(String(url).trim());
    try {
      // The server fetches the file (SSRF-hardened, nothing is stored). The browser itself
      // never contacts third-party hosts for documents (CSP connect-src 'self').
      const res = await fetch('api/fetch.php?url=' + encodeURIComponent(target), {
        headers: { 'X-Marklight': '1' }, credentials: 'omit', cache: 'no-store',
      });
      if (!res.ok) {
        let code = 'upstream_status';
        try { code = (await res.json()).error || code; } catch (e) { /* ignore */ }
        const msg = t('fetch.' + code);
        throw new Error(msg === 'fetch.' + code ? code : msg);
      }
      const text = await res.text();
      const finalUrl = decodeURIComponent(res.headers.get('X-Final-Url') || '') || target;
      const name = decodeURIComponent(new URL(finalUrl).pathname.split('/').pop() || 'document.md');
      openDocs([{ name, path: name, content: text, source: 'url', url: finalUrl }]);
      const u = new URL(location.href);
      u.search = '?url=' + encodeURIComponent(String(url).trim());
      u.hash = '';
      history.replaceState(null, '', u);
    } catch (e) {
      ML.toast(t('reader.urlError', { msg: e.message || String(e) }), 'error');
    }
  }

  function openText(content, name, source) {
    openDocs([{ name: name || t('reader.untitled'), path: name || '', content, source: source || 'paste' }]);
  }

  function closeDoc() {
    resetWorkspace();
    headings = [];
    els.toc.innerHTML = '';
    els.fileList.innerHTML = '';
    els.tocEmpty.hidden = false;
    els.filesEmpty.hidden = false;
    els.content.hidden = true;
    els.content.innerHTML = '';
    els.dropzone.hidden = false;
    els.docMeta.hidden = true;
    els.title.textContent = '';
    els.progress.style.width = '0';
    document.title = t('nav.reader') + ' · Marklight';
    if (location.hash || location.search) history.replaceState(null, '', location.pathname);
    renderRecent();
  }

  /* ---------- Recent documents (stored locally only) ---------- */
  function addRecent(doc) {
    if (doc.source === 'demo' || doc.content.length > 300000) return;
    let list = store.get('recent', []);
    list = list.filter((r) => !(r.name === doc.name && (r.url || '') === (doc.url || '')));
    list.unshift({ name: doc.name, content: doc.content, url: doc.url || '', ts: Date.now() });
    while (list.length > 8) list.pop();
    if (!store.set('recent', list)) { list.length = Math.min(list.length, 3); store.set('recent', list); }
  }
  function renderRecent() {
    const list = store.get('recent', []);
    els.recent.hidden = !list.length;
    els.recentList.innerHTML = '';
    list.forEach((r, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'open';
      const n = document.createElement('span'); n.className = 'name'; n.textContent = r.name;
      const s = document.createElement('small'); s.textContent = ML.formatDate(r.ts);
      b.append(n, s);
      b.addEventListener('click', () => openDocs([{ name: r.name, path: r.name, content: r.content, source: r.url ? 'url' : 'file', url: r.url || undefined }]));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-ghost btn-icon';
      del.innerHTML = ML.icon('x');
      del.title = t('reader.remove'); del.setAttribute('aria-label', t('reader.remove'));
      del.addEventListener('click', () => { const l = store.get('recent', []); l.splice(i, 1); store.set('recent', l); renderRecent(); });
      li.append(b, del);
      els.recentList.appendChild(li);
    });
  }
  $('#clearRecent').addEventListener('click', () => { store.del('recent'); renderRecent(); });

  /* ---------- Drag & drop (files and folders) ---------- */
  els.scroller.dataset.drop = t('reader.dropHere');
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) { dragDepth++; els.scroller.classList.add('dragover'); } });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) els.scroller.classList.remove('dragover'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragDepth = 0;
    els.scroller.classList.remove('dragover');
    const items = Array.from(e.dataTransfer.items || []);
    const entries = items.map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null)).filter(Boolean);
    if (entries.some((en) => en.isDirectory)) {
      const out = [];
      await Promise.all(entries.map((en) => walkEntry(en, '', out)));
      openFolderFiles(out);
    } else {
      openFiles(Array.from(e.dataTransfer.files));
    }
  });
  function walkEntry(entry, prefix, out) {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((f) => { out.push({ path: prefix + entry.name, file: f }); resolve(); }, () => resolve());
      } else if (entry.isDirectory) {
        if (/^(node_modules|\.git)$/.test(entry.name)) return resolve();
        const reader = entry.createReader();
        const all = [];
        const readBatch = () => reader.readEntries(async (batch) => {
          if (!batch.length) {
            await Promise.all(all.map((en) => walkEntry(en, prefix + entry.name + '/', out)));
            resolve();
          } else { all.push(...batch); readBatch(); }
        }, () => resolve());
        readBatch();
      } else resolve();
    });
  }

  /* ---------- Actions ---------- */
  async function act(name) {
    const doc = docs[current];
    switch (name) {
      case 'file': els.fileInput.click(); break;
      case 'folder': els.folderInput.click(); break;
      case 'url': {
        const url = await ML.modal({ title: t('reader.openUrl'), text: t('reader.urlHint'), input: { type: 'url', placeholder: 'https://…' }, ok: t('reader.load') });
        if (url) loadUrl(url);
        break;
      }
      case 'paste': {
        const text = await ML.modal({ title: t('reader.paste'), input: { multiline: true, placeholder: '# Hello' }, ok: t('reader.show') });
        if (text) openText(text, t('reader.pasted'));
        break;
      }
      case 'demo': loadDemo(); break;
      case 'close': closeDoc(); break;
      default:
        if (!doc) { ML.toast(t('reader.nothingOpen'), 'error'); return; }
        if (name === 'share') ML.shareLink(doc.content, 'reader.php');
        if (name === 'edit') { store.set('draft', { content: doc.content, name: doc.name, ts: Date.now() }); location.href = 'editor.php'; }
        if (name === 'dl-md') ML.download(ML.baseName(doc.name) + '.md', doc.content, 'text/markdown;charset=utf-8');
        if (name === 'dl-html') ML.download(ML.baseName(doc.name) + '.html', ML.exportHtml(doc.content, ML.baseName(doc.name)), 'text/html;charset=utf-8');
        if (name === 'copy-html') ML.copy(ML.toHtml(doc.content).html);
        if (name === 'copy-md') ML.copy(doc.content);
        if (name === 'print') window.print();
    }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) act(b.dataset.act);
  });
  $('#urlForm').addEventListener('submit', (e) => { e.preventDefault(); loadUrl($('#urlInput').value); });
  els.fileInput.addEventListener('change', () => { openFiles(Array.from(els.fileInput.files)); els.fileInput.value = ''; });
  els.folderInput.addEventListener('change', () => {
    openFolderFiles(Array.from(els.folderInput.files).map((f) => ({ path: f.webkitRelativePath || f.name, file: f })));
    els.folderInput.value = '';
  });

  async function loadDemo() {
    try {
      const res = await fetch('assets/demo-' + ML.lang + '.md');
      const text = res.ok ? await res.text() : await (await fetch('assets/demo-en.md')).text();
      openDocs([{ name: 'demo.md', path: 'demo.md', content: text, source: 'demo' }]);
    } catch (e) { ML.toast(t('reader.urlError', { msg: e.message }), 'error'); }
  }

  /* ---------- Sidebar ---------- */
  function selectTab(name) {
    $$('.sidebar-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    $('#panel-toc').hidden = name !== 'toc';
    $('#panel-files').hidden = name !== 'files';
  }
  $$('.sidebar-tabs button').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));
  if (store.get('sidebarHidden', false) && !window.matchMedia('(max-width: 900px)').matches) els.layout.classList.add('no-sidebar');
  $('#sidebarBtn').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 900px)').matches) { els.layout.classList.toggle('mobile-open'); return; }
    els.layout.classList.toggle('no-sidebar');
    store.set('sidebarHidden', els.layout.classList.contains('no-sidebar'));
  });

  /* ---------- Display settings ---------- */
  const s = ML.settings;
  const sizeRange = $('#sizeRange'); const widthRange = $('#widthRange');
  function syncSettingsUI() {
    sizeRange.value = s.size; $('#sizeOut').textContent = s.size;
    widthRange.value = s.width; $('#widthOut').textContent = s.width;
    $$('#fontSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === s.font)));
    $('#mathChk').checked = s.math; $('#mermaidChk').checked = s.mermaid;
    ML.updateHeader();
  }
  sizeRange.addEventListener('input', () => ML.setSetting('size', +sizeRange.value));
  widthRange.addEventListener('input', () => ML.setSetting('width', +widthRange.value));
  $$('#fontSeg button').forEach((b) => b.addEventListener('click', () => ML.setSetting('font', b.dataset.v)));
  $$('.swatch').forEach((b) => b.addEventListener('click', () => ML.setSetting('theme', b.dataset.v)));
  $('#mathChk').addEventListener('change', (e) => ML.setSetting('math', e.target.checked));
  $('#mermaidChk').addEventListener('change', (e) => ML.setSetting('mermaid', e.target.checked));
  ML.onSettings((key) => {
    syncSettingsUI();
    if (['math', 'mermaid', 'theme'].includes(key) && current >= 0) {
      const top = els.scroller.scrollTop;
      renderCurrent();
      els.scroller.scrollTop = top;
    }
  });
  document.addEventListener('marklight:lang', () => {
    els.scroller.dataset.drop = t('reader.dropHere');
    renderRecent();
    if (current >= 0) { const top = els.scroller.scrollTop; renderCurrent(); els.scroller.scrollTop = top; }
  });

  /* ---------- Fullscreen & presentation ---------- */
  $('#fullBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
  });

  function splitSlides(md) {
    const body = ML.splitFrontMatter(md).body;
    const slides = [];
    let cur = [];
    let fence = null;
    body.split('\n').forEach((line) => {
      const f = /^\s*(```+|~~~+)/.exec(line);
      if (f) { if (!fence) fence = f[1][0]; else if (f[1][0] === fence) fence = null; }
      if (!fence && /^\s*(---|\*\*\*|___)\s*$/.test(line)) { slides.push(cur.join('\n')); cur = []; return; }
      cur.push(line);
    });
    slides.push(cur.join('\n'));
    const real = slides.filter((x) => x.trim());
    if (real.length > 1) return real;
    // No explicit separators → one slide per H1/H2 section
    const parts = body.split(/\n(?=#{1,2} )/).filter((x) => x.trim());
    return parts.length ? parts : [body];
  }

  $('#presentBtn').addEventListener('click', () => {
    const doc = docs[current];
    if (!doc) { ML.toast(t('reader.nothingOpen'), 'error'); return; }
    const slides = splitSlides(doc.content);
    let i = 0;
    const wrap = document.createElement('div');
    wrap.className = 'present';
    wrap.innerHTML = '<div class="present-progress"></div><div class="present-stage"><article class="present-slide markdown-body"></article></div>' +
      '<div class="present-bar"><button class="btn btn-sm" data-p="prev">' + ML.icon('chevron-left') + '</button>' +
      '<span class="count"></span><span class="hide-sm">' + ML.escapeHtml(t('reader.presentHint')) + '</span>' +
      '<button class="btn btn-sm" data-p="next">' + ML.icon('chevron-right') + '</button><button class="btn btn-sm" data-p="exit">' + ML.icon('x') + '</button></div>';
    document.body.appendChild(wrap);
    const slideEl = wrap.querySelector('.present-slide');
    const draw = () => {
      ML.render(slides[i], slideEl, { resolveUrl, onLink: () => true });
      wrap.querySelector('.count').textContent = (i + 1) + ' / ' + slides.length;
      wrap.querySelector('.present-progress').style.width = ((i + 1) / slides.length * 100) + '%';
      wrap.querySelector('.present-stage').scrollTop = 0;
    };
    const go = (d) => { i = Math.max(0, Math.min(slides.length - 1, i + d)); draw(); };
    const exit = () => { document.removeEventListener('keydown', onKey); wrap.remove(); if (document.fullscreenElement) document.exitFullscreen(); };
    const onKey = (e) => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') { i = 0; draw(); }
      else if (e.key === 'End') { i = slides.length - 1; draw(); }
      else if (e.key === 'Escape') exit();
    };
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      if (b.dataset.p === 'prev') go(-1); else if (b.dataset.p === 'next') go(1); else exit();
    });
    document.addEventListener('keydown', onKey);
    if (document.documentElement.requestFullscreen) wrap.requestFullscreen().catch(() => {});
    draw();
  });

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); els.fileInput.click(); }
  });

  /* ---------- Boot ---------- */
  if (!CFG.fetch) $$('[data-act="url"], #urlForm').forEach((el) => { el.hidden = true; });
  syncSettingsUI();
  renderRecent();
  (async function boot() {
    const params = new URLSearchParams(location.search);
    if (location.hash.startsWith('#md=')) {
      try {
        const text = await ML.decodeShare(location.hash.slice(4));
        openText(text, t('reader.shared'), 'share');
      } catch (e) { ML.toast(t('reader.shareError'), 'error'); }
    } else if (params.get('url')) {
      $('#urlInput').value = params.get('url');
      loadUrl(params.get('url'));
    } else if (params.has('demo')) {
      loadDemo();
    } else {
      const handoff = sessionStorage.getItem('marklight:handoff');
      if (handoff) {
        sessionStorage.removeItem('marklight:handoff');
        try { const h = JSON.parse(handoff); openText(h.content, h.name, 'file'); } catch (e) { /* ignore */ }
      }
    }
  })();

  // PWA file handling (installed app opened with a .md file)
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (params) => {
      if (!params.files || !params.files.length) return;
      const files = await Promise.all(params.files.map((h) => h.getFile()));
      openFiles(files);
    });
  }
})();
