/* Marklight – Editor. Engineered by EinfachDev · GPL-3.0-or-later */
(function () {
  'use strict';
  const ML = window.Marklight;
  const { $, $$, t, store } = ML;

  const src = $('#src');
  const preview = $('#preview');
  const previewPane = $('#previewPane');
  const layout = $('#edLayout');
  const nameInput = $('#docName');
  const saved = $('#stSaved');

  /* ---------- Load draft ---------- */
  const draft = store.get('draft', null);
  src.value = draft && typeof draft.content === 'string' ? draft.content : t('ed.welcome');
  nameInput.value = (draft && draft.name) || 'document.md';

  /* ---------- Render ---------- */
  function render() {
    const res = ML.render(src.value, preview);
    $('#stWords').textContent = t('stats.words', { n: ML.formatNumber(res.stats.words) });
    $('#stChars').textContent = t('stats.chars', { n: ML.formatNumber(res.stats.chars) });
    $('#stLines').textContent = t('stats.lines', { n: ML.formatNumber(res.stats.lines) });
    $('#stRead').textContent = t('stats.reading', { n: res.stats.minutes });
  }
  const renderSoon = ML.debounce(render, 120);

  function persist() {
    const ok = store.set('draft', { content: src.value, name: nameInput.value, ts: Date.now() });
    saved.classList.toggle('dirty', !ok);
    saved.textContent = ok ? t('ed.saved') : t('ed.notSaved');
  }
  const persistSoon = ML.debounce(persist, 400);

  function changed() {
    saved.classList.add('dirty');
    saved.textContent = t('ed.saving');
    renderSoon();
    persistSoon();
  }
  src.addEventListener('input', changed);
  nameInput.addEventListener('input', persistSoon);

  /* ---------- Cursor position ---------- */
  function updatePos() {
    const before = src.value.slice(0, src.selectionStart);
    const line = before.split('\n').length;
    const col = before.length - before.lastIndexOf('\n');
    $('#stPos').textContent = t('ed.pos', { l: line, c: col });
  }
  ['keyup', 'click', 'select', 'input'].forEach((ev) => src.addEventListener(ev, updatePos));

  /* ---------- Text manipulation (keeps native undo where supported) ---------- */
  function replaceRange(start, end, text, selStart, selEnd) {
    src.focus();
    src.setSelectionRange(start, end);
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
    if (!ok) { src.setRangeText(text, start, end, 'end'); }
    src.setSelectionRange(selStart !== undefined ? selStart : start + text.length, selEnd !== undefined ? selEnd : start + text.length);
    if (!ok) changed();
  }

  function wrap(before, after, placeholder) {
    const s = src.selectionStart, e = src.selectionEnd;
    const sel = src.value.slice(s, e);
    // toggle off if already wrapped
    if (sel && src.value.slice(s - before.length, s) === before && src.value.slice(e, e + after.length) === after) {
      replaceRange(s - before.length, e + after.length, sel, s - before.length, e - before.length);
      return;
    }
    const text = sel || placeholder || '';
    replaceRange(s, e, before + text + after, s + before.length, s + before.length + text.length);
  }

  function lineRange() {
    const v = src.value;
    const start = v.lastIndexOf('\n', src.selectionStart - 1) + 1;
    let end = v.indexOf('\n', src.selectionEnd - (src.selectionEnd > src.selectionStart && v[src.selectionEnd - 1] === '\n' ? 1 : 0));
    if (end < 0) end = v.length;
    return [start, end];
  }

  function prefixLines(fn) {
    const [start, end] = lineRange();
    const lines = src.value.slice(start, end).split('\n');
    const out = lines.map(fn).join('\n');
    replaceRange(start, end, out, start, start + out.length);
  }

  function togglePrefix(prefix, re) {
    const [start, end] = lineRange();
    const lines = src.value.slice(start, end).split('\n');
    const all = lines.every((l) => re.test(l) || !l.trim());
    prefixLines((l, i) => {
      if (!l.trim()) return l;
      if (all) return l.replace(re, '');
      const p = typeof prefix === 'function' ? prefix(i) : prefix;
      return p + l.replace(/^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/, '$1');
    });
  }

  const FMT = {
    bold: () => wrap('**', '**', t('ed.phBold')),
    italic: () => wrap('_', '_', t('ed.phItalic')),
    strike: () => wrap('~~', '~~', t('ed.phText')),
    code: () => wrap('`', '`', 'code'),
    heading: () => {
      const [start, end] = lineRange();
      const line = src.value.slice(start, end);
      const m = /^(#{1,6})\s/.exec(line);
      const level = m ? m[1].length : 0;
      const next = level >= 3 ? '' : '#'.repeat(level + 1) + ' ';
      const body = line.replace(/^#{1,6}\s+/, '');
      const out = next + body;
      replaceRange(start, end, out, start + out.length, start + out.length);
    },
    link: () => {
      const s = src.selectionStart, e = src.selectionEnd;
      const sel = src.value.slice(s, e);
      if (/^https?:\/\/\S+$/.test(sel)) { replaceRange(s, e, '[' + t('ed.phLink') + '](' + sel + ')', s + 1, s + 1 + t('ed.phLink').length); return; }
      const text = sel || t('ed.phLink');
      const ins = '[' + text + '](https://)';
      replaceRange(s, e, ins, s + text.length + 3, s + ins.length - 1);
    },
    image: () => {
      const s = src.selectionStart, e = src.selectionEnd;
      const alt = src.value.slice(s, e) || t('ed.phAlt');
      const ins = '![' + alt + '](https://)';
      replaceRange(s, e, ins, s + alt.length + 4, s + ins.length - 1);
    },
    codeblock: () => {
      const s = src.selectionStart, e = src.selectionEnd;
      const sel = src.value.slice(s, e);
      const lead = s > 0 && src.value[s - 1] !== '\n' ? '\n' : '';
      const ins = lead + '```js\n' + (sel || '') + '\n```\n';
      const cursor = s + lead.length + 6;
      replaceRange(s, e, ins, cursor, cursor + sel.length);
    },
    quote: () => togglePrefix('> ', /^>\s?/),
    ul: () => togglePrefix('- ', /^\s*[-*+]\s+(?!\[[ xX]\])/),
    ol: () => togglePrefix((i) => (i + 1) + '. ', /^\s*\d+[.)]\s+/),
    task: () => togglePrefix('- [ ] ', /^\s*[-*+]\s+\[[ xX]\]\s+/),
    hr: () => {
      const s = src.selectionStart;
      const lead = s > 0 && src.value[s - 1] !== '\n' ? '\n\n' : '\n';
      replaceRange(s, src.selectionEnd, lead + '---\n\n');
    },
    table: () => {
      const s = src.selectionStart;
      const lead = s > 0 && src.value[s - 1] !== '\n' ? '\n\n' : '';
      const c = t('ed.phColumn');
      const tbl = lead + '| ' + c + ' 1 | ' + c + ' 2 | ' + c + ' 3 |\n| --- | --- | --- |\n|   |   |   |\n|   |   |   |\n';
      replaceRange(s, src.selectionEnd, tbl);
    },
  };

  $$('[data-fmt]').forEach((b) => b.addEventListener('click', () => FMT[b.dataset.fmt]()));
  const addKbdHints = () => $$('[data-fmt]').forEach((b) => { if (b.dataset.kbd) b.title = ML.t(b.dataset.i18nTitle) + ' (' + b.dataset.kbd + ')'; });
  // core.js translates titles on DOMContentLoaded (registered earlier → runs first)
  document.addEventListener('DOMContentLoaded', addKbdHints);
  document.addEventListener('marklight:lang', () => { addKbdHints(); render(); });

  /* ---------- Keyboard ---------- */
  src.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase();
      const map = { b: 'bold', i: 'italic', k: 'link', e: 'code', h: 'heading' };
      if (map[k] && !e.shiftKey) { e.preventDefault(); FMT[map[k]](); return; }
      if (k === 's') { e.preventDefault(); act('dl-md'); return; }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = src.selectionStart, en = src.selectionEnd;
      if (s === en && !e.shiftKey) { replaceRange(s, en, '  '); return; }
      prefixLines((l) => (e.shiftKey ? l.replace(/^( {1,2}|\t)/, '') : '  ' + l));
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod && src.selectionStart === src.selectionEnd) {
      const v = src.value;
      const pos = src.selectionStart;
      const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
      const line = v.slice(lineStart, pos);
      const m = /^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|(\d+)([.)])\s+|>\s?)/.exec(line);
      if (!m) return;
      e.preventDefault();
      if (line.trim() === m[0].trim()) { // empty item → end the list
        replaceRange(lineStart, pos, '');
        return;
      }
      let marker = m[2];
      if (m[3]) marker = (parseInt(m[3], 10) + 1) + m[4] + ' ';
      else if (/\[[ xX]\]/.test(marker)) marker = marker.replace(/\[[xX]\]/, '[ ]');
      replaceRange(pos, pos, '\n' + m[1] + marker);
    }
  });

  /* ---------- Paste: turn a pasted URL on a selection into a link ---------- */
  src.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const s = src.selectionStart, en = src.selectionEnd;
    if (s !== en && /^https?:\/\/\S+$/.test(text.trim())) {
      e.preventDefault();
      const sel = src.value.slice(s, en);
      replaceRange(s, en, '[' + sel + '](' + text.trim() + ')');
    }
  });

  /* ---------- View mode ---------- */
  function setView(v) {
    layout.dataset.view = v;
    $$('#viewSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    store.set('editorView', v);
  }
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.v)));
  setView(store.get('editorView', window.matchMedia('(max-width: 900px)').matches ? 'edit' : 'split'));

  /* ---------- Synced scrolling ---------- */
  let lock = null;
  function sync(from, to) {
    if (lock && lock !== from) return;
    lock = from;
    const max = from.scrollHeight - from.clientHeight;
    const ratio = max > 0 ? from.scrollTop / max : 0;
    to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
    clearTimeout(sync.t);
    sync.t = setTimeout(() => { lock = null; }, 80);
  }
  const srcScroller = src.parentElement;
  srcScroller.addEventListener('scroll', () => sync(srcScroller, previewPane), { passive: true });
  src.addEventListener('scroll', () => sync(src, previewPane), { passive: true });
  previewPane.addEventListener('scroll', () => sync(previewPane, src.scrollHeight > src.clientHeight ? src : srcScroller), { passive: true });

  /* ---------- File actions ---------- */
  const fileInput = $('#fileInput');
  async function openFile(file) {
    if (!file) return;
    const text = await ML.readFile(file);
    src.value = text;
    nameInput.value = file.name;
    render(); persist(); updatePos();
  }
  fileInput.addEventListener('change', () => { openFile(fileInput.files[0]); fileInput.value = ''; });
  src.addEventListener('dragover', (e) => e.preventDefault());
  src.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (f && ML.isMarkdownName(f.name)) { e.preventDefault(); openFile(f); }
  });

  async function act(name) {
    const fname = nameInput.value.trim() || 'document.md';
    switch (name) {
      case 'new': {
        if (src.value.trim()) {
          const ok = await ML.modal({ title: t('ed.new'), text: t('ed.newConfirm'), ok: t('ed.discard') });
          if (!ok) return;
        }
        src.value = ''; nameInput.value = 'document.md'; render(); persist(); src.focus();
        break;
      }
      case 'open': fileInput.click(); break;
      case 'dl-md': ML.download(/\.\w+$/.test(fname) ? fname : fname + '.md', src.value, 'text/markdown;charset=utf-8'); break;
      case 'dl-html': ML.download(ML.baseName(fname) + '.html', ML.exportHtml(src.value, ML.baseName(fname)), 'text/html;charset=utf-8'); break;
      case 'copy-html': ML.copy(ML.toHtml(src.value).html); break;
      case 'print': {
        const prev = layout.dataset.view;
        layout.dataset.view = 'preview';
        setTimeout(() => { window.print(); layout.dataset.view = prev; }, 50);
        break;
      }
      case 'share': ML.shareLink(src.value, 'reader.php'); break;
      case 'reader':
        try { sessionStorage.setItem('marklight:handoff', JSON.stringify({ content: src.value, name: fname })); } catch (e) { /* ignore */ }
        location.href = 'reader.php';
        break;
      default: break;
    }
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act); });

  ML.onSettings((key) => { if (['theme', 'math', 'mermaid'].includes(key)) render(); });

  // Sync between tabs: another tab saved a newer draft
  window.addEventListener('storage', (e) => {
    if (e.key !== 'marklight:draft' || document.hasFocus()) return;
    try {
      const d = JSON.parse(e.newValue);
      if (d && d.content !== src.value) { src.value = d.content; nameInput.value = d.name || nameInput.value; render(); }
    } catch (err) { /* ignore */ }
  });

  render();
  updatePos();
  saved.textContent = t('ed.saved');
})();
