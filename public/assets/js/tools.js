/* Marklight – Tools. Engineered by EinfachDev · GPL-3.0-or-later */
(function () {
  'use strict';
  const ML = window.Marklight;
  const { $, $$, t, store } = ML;

  /* ---------- Routing ---------- */
  const TOOLS = ['table', 'toc', 'html2md', 'md2html', 'diff', 'lint'];
  function route() {
    const id = TOOLS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'table';
    TOOLS.forEach((x) => { $('#tool-' + x).hidden = x !== id; });
    $$('.tools-nav a').forEach((a) => a.classList.toggle('active', a.dataset.tool === id));
    store.set('lastTool', id);
  }
  if (!location.hash) history.replaceState(null, '', '#' + store.get('lastTool', 'table'));
  window.addEventListener('hashchange', route);
  route();

  /* ---------- Shared helpers ---------- */
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) { ML.copy($(c.dataset.copy).value); return; }
    const l = e.target.closest('[data-load-draft]');
    if (l) {
      const d = store.get('draft', null);
      if (!d || !d.content) { ML.toast(t('common.noDraft'), 'error'); return; }
      const ta = $(l.dataset.loadDraft);
      ta.value = d.content;
      ta.dispatchEvent(new Event('input'));
      return;
    }
    const te = e.target.closest('[data-to-editor]');
    if (te) {
      store.set('draft', { content: $(te.dataset.toEditor).value, name: 'converted.md', ts: Date.now() });
      location.href = 'editor.php';
    }
  });
  // Allow dropping files into any tool textarea
  $$('.tool textarea:not([readonly])').forEach((ta) => {
    ta.addEventListener('dragover', (e) => e.preventDefault());
    ta.addEventListener('drop', async (e) => {
      const f = e.dataTransfer && e.dataTransfer.files[0];
      if (!f) return;
      e.preventDefault();
      ta.value = await ML.readFile(f);
      ta.dispatchEvent(new Event('input'));
    });
  });
  // Persist tool inputs locally so a reload does not lose work
  $$('.tool textarea:not([readonly])').forEach((ta) => {
    const key = 'tool:' + ta.id;
    const v = store.get(key, null);
    if (typeof v === 'string') ta.value = v;
    ta.addEventListener('input', ML.debounce(() => store.set(key, ta.value), 400));
  });

  /** Splits Markdown into lines and marks lines inside fenced code blocks. */
  function scanLines(md) {
    const lines = md.split('\n');
    const inCode = [];
    let fence = null;
    lines.forEach((line, i) => {
      const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (fence) {
        inCode[i] = true;
        if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !line.slice(m[0].length).trim()) fence = null;
      } else if (m) { fence = m[1]; inCode[i] = true; } else inCode[i] = false;
    });
    return { lines, inCode, unclosed: !!fence };
  }

  /* ==========================================================================
     Table generator
     ========================================================================== */
  const tb = store.get('table', null) || {
    head: ['Name', 'Version', 'License'],
    rows: [['Marklight', '1.0', 'GPL-3.0'], ['', '', '']],
    align: ['l', 'c', 'l'],
  };
  const grid = $('#tbGrid');

  function tbSave() { store.set('table', tb); }
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const width = (s) => Array.from(s).length;

  function tbMarkdown() {
    const pretty = $('#tbPretty').checked;
    const cols = tb.head.length;
    const all = [tb.head, ...tb.rows].map((r) => Array.from({ length: cols }, (_, i) => esc(r[i] || '')));
    const w = Array.from({ length: cols }, (_, i) => Math.max(3, ...all.map((r) => width(r[i]))));
    const pad = (s, i) => {
      if (!pretty) return s;
      const n = w[i] - width(s);
      if (tb.align[i] === 'r') return ' '.repeat(n) + s;
      if (tb.align[i] === 'c') return ' '.repeat(Math.floor(n / 2)) + s + ' '.repeat(Math.ceil(n / 2));
      return s + ' '.repeat(n);
    };
    const line = (r) => '| ' + r.map(pad).join(' | ') + ' |';
    const sep = '| ' + tb.align.map((a, i) => {
      const n = pretty ? w[i] : 3;
      if (a === 'c') return ':' + '-'.repeat(n - 2) + ':';
      if (a === 'r') return '-'.repeat(n - 1) + ':';
      return '-'.repeat(n);
    }).join(' | ') + ' |';
    return [line(all[0]), sep, ...all.slice(1).map(line)].join('\n') + '\n';
  }

  function tbOutput() {
    const md = tbMarkdown();
    $('#tbOut').value = md;
    ML.render(md, $('#tbPreview'));
    tbSave();
  }

  function tbBuild() {
    grid.innerHTML = '';
    const cols = tb.head.length;
    // control row
    const ctl = grid.insertRow();
    for (let c = 0; c < cols; c++) {
      const td = ctl.insertCell();
      td.className = 'ctl';
      ['l', 'c', 'r'].forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = { l: '⇤', c: '↔', r: '⇥' }[a];
        b.title = t('tb.align.' + a);
        b.className = tb.align[c] === a ? 'on' : '';
        b.addEventListener('click', () => { tb.align[c] = a; tbBuild(); });
        td.appendChild(b);
      });
      const del = document.createElement('button');
      del.type = 'button'; del.textContent = '✕'; del.title = t('tb.delCol');
      del.addEventListener('click', () => {
        if (tb.head.length <= 1) return;
        tb.head.splice(c, 1); tb.align.splice(c, 1); tb.rows.forEach((r) => r.splice(c, 1)); tbBuild();
      });
      td.appendChild(del);
    }
    ctl.insertCell().className = 'ctl';
    // header + body
    [tb.head, ...tb.rows].forEach((row, ri) => {
      const tr = grid.insertRow();
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement(ri === 0 ? 'th' : 'td');
        const inp = document.createElement('input');
        inp.value = row[c] || '';
        inp.setAttribute('aria-label', (ri === 0 ? 'Header ' : 'Row ' + ri + ' ') + 'column ' + (c + 1));
        inp.addEventListener('input', () => { row[c] = inp.value; tbOutput(); });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (ri === tb.rows.length) { tb.rows.push(Array(cols).fill('')); tbBuild(); }
            const next = grid.rows[ri + 2] && grid.rows[ri + 2].cells[c].querySelector('input');
            if (next) next.focus();
          }
        });
        inp.addEventListener('paste', (e) => {
          const text = e.clipboardData.getData('text');
          if (!/[\t\n]/.test(text.trim())) return;
          e.preventDefault();
          pasteBlock(parseDelimited(text), ri, c);
        });
        cell.appendChild(inp);
        tr.appendChild(cell);
      }
      const ctlCell = tr.insertCell();
      ctlCell.className = 'ctl';
      if (ri > 0) {
        const del = document.createElement('button');
        del.type = 'button'; del.textContent = '✕'; del.title = t('tb.delRow');
        del.addEventListener('click', () => { tb.rows.splice(ri - 1, 1); if (!tb.rows.length) tb.rows.push(Array(cols).fill('')); tbBuild(); });
        ctlCell.appendChild(del);
      }
    });
    tbOutput();
  }

  function pasteBlock(data, startRow, startCol) {
    data.forEach((r, i) => {
      r.forEach((v, j) => {
        const c = startCol + j;
        while (tb.head.length <= c) { tb.head.push(''); tb.align.push('l'); tb.rows.forEach((row) => row.push('')); }
        const rowIdx = startRow + i; // 0 = header
        if (rowIdx === 0) tb.head[c] = v;
        else {
          while (tb.rows.length < rowIdx) tb.rows.push(Array(tb.head.length).fill(''));
          tb.rows[rowIdx - 1][c] = v;
        }
      });
    });
    tbBuild();
  }

  /** CSV / TSV / semicolon parser with quote support. */
  function parseDelimited(text) {
    text = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    const first = text.split('\n')[0];
    const counts = { '\t': (first.match(/\t/g) || []).length, ';': (first.match(/;/g) || []).length, ',': (first.match(/,/g) || []).length };
    const d = counts['\t'] ? '\t' : counts[';'] > counts[','] ? ';' : ',';
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === d) { row.push(cell.trim()); cell = ''; }
      else if (ch === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    row.push(cell.trim()); rows.push(row);
    return rows;
  }

  function parseMarkdownTable(text) {
    const lines = text.trim().split('\n').filter((l) => l.trim().startsWith('|') || l.includes('|'));
    const split = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
    if (lines.length < 2 || !/^[\s|:-]+$/.test(lines[1])) return null;
    const head = split(lines[0]);
    const align = split(lines[1]).map((s) => (s.startsWith(':') && s.endsWith(':') ? 'c' : s.endsWith(':') ? 'r' : 'l'));
    const rows = lines.slice(2).map(split);
    return { head, align, rows };
  }

  $('#tbAddRow').addEventListener('click', () => { tb.rows.push(Array(tb.head.length).fill('')); tbBuild(); });
  $('#tbAddCol').addEventListener('click', () => { tb.head.push(''); tb.align.push('l'); tb.rows.forEach((r) => r.push('')); tbBuild(); });
  $('#tbClear').addEventListener('click', () => {
    tb.head = ['', '', '']; tb.align = ['l', 'l', 'l']; tb.rows = [['', '', ''], ['', '', '']]; tbBuild();
  });
  $('#tbTranspose').addEventListener('click', () => {
    const all = [tb.head, ...tb.rows];
    const tr = tb.head.map((_, c) => all.map((r) => r[c] || ''));
    tb.head = tr[0]; tb.rows = tr.slice(1); tb.align = tb.head.map(() => 'l');
    tbBuild();
  });
  $('#tbPretty').addEventListener('change', tbOutput);
  $('#tbImport').addEventListener('click', async () => {
    const text = await ML.modal({ title: t('tb.import'), text: t('tb.importHint'), input: { multiline: true }, ok: t('tb.importOk') });
    if (!text || !text.trim()) return;
    const md = parseMarkdownTable(text);
    if (md) Object.assign(tb, md);
    else {
      const rows = parseDelimited(text);
      const cols = Math.max(...rows.map((r) => r.length));
      const norm = rows.map((r) => Array.from({ length: cols }, (_, i) => r[i] || ''));
      tb.head = norm[0]; tb.rows = norm.slice(1).length ? norm.slice(1) : [Array(cols).fill('')]; tb.align = Array(cols).fill('l');
    }
    tbBuild();
  });
  tbBuild();

  /* ==========================================================================
     TOC generator
     ========================================================================== */
  function tocBuild() {
    const md = $('#tocIn').value;
    const min = +$('#tocMin').value, max = Math.max(min, +$('#tocMax').value);
    const style = $('#tocStyle').value, links = $('#tocLinks').checked;
    const headings = ML.toHtml(md.replace(/<!--\s*toc\s*-->[\s\S]*?<!--\s*tocstop\s*-->/i, '')).headings.filter((h) => h.level >= min && h.level <= max);
    const counters = [];
    const out = headings.map((h) => {
      const depth = h.level - min;
      counters.length = depth + 1;
      counters[depth] = (counters[depth] || 0) + 1;
      const bullet = style === '1.' ? counters[depth] + '.' : style;
      const text = h.text.replace(/([[\]])/g, '\\$1');
      const indent = (style === '1.' ? '   ' : '  ').repeat(depth);
      return indent + bullet + ' ' + (links ? '[' + text + '](#' + h.slug + ')' : text);
    }).join('\n');
    const body = out ? out + '\n' : '';
    $('#tocOut').value = $('#tocMarkers').checked && body ? '<!-- toc -->\n' + body + '<!-- tocstop -->\n' : body;
  }
  ['#tocIn', '#tocMin', '#tocMax', '#tocStyle', '#tocLinks', '#tocMarkers'].forEach((s) => $(s).addEventListener(s === '#tocIn' ? 'input' : 'change', ML.debounce(tocBuild, 150)));
  $('#tocInsert').addEventListener('click', () => {
    const toc = $('#tocOut').value;
    if (!toc.trim()) return;
    const ta = $('#tocIn');
    let md = ta.value;
    const block = /<!--\s*toc\s*-->[\s\S]*?<!--\s*tocstop\s*-->\n?/i;
    const insert = /^<!--/.test(toc) ? toc : '<!-- toc -->\n' + toc + '<!-- tocstop -->\n';
    if (block.test(md)) md = md.replace(block, insert);
    else {
      const { lines, inCode } = scanLines(md);
      const h1 = lines.findIndex((l, i) => !inCode[i] && /^#\s/.test(l));
      if (h1 >= 0) { lines.splice(h1 + 1, 0, '', insert.trimEnd()); md = lines.join('\n'); }
      else md = insert + '\n' + md;
    }
    ta.value = md;
    ta.dispatchEvent(new Event('input'));
    ML.toast(t('toc.inserted'));
  });
  tocBuild();

  /* ==========================================================================
     HTML → Markdown
     ========================================================================== */
  function h2mConvert() {
    if (!window.TurndownService) return;
    const svc = new window.TurndownService({
      headingStyle: $('#h2mHeading').value,
      bulletListMarker: $('#h2mBullet').value,
      emDelimiter: $('#h2mEm').value,
      codeBlockStyle: $('#h2mCode').value,
      fence: '```',
      hr: '---',
    });
    if (window.turndownPluginGfm) svc.use(window.turndownPluginGfm.gfm);
    svc.remove(['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'form', 'button', 'input', 'select', 'textarea']);
    // Sanitize first – the converter never sees active content
    const clean = window.DOMPurify.sanitize($('#h2mIn').value, { FORBID_TAGS: ['style', 'form'], WHOLE_DOCUMENT: false });
    try { $('#h2mOut').value = svc.turndown(clean).replace(/\n{3,}/g, '\n\n') + '\n'; } catch (e) { $('#h2mOut').value = String(e.message || e); }
  }
  $('#h2mIn').addEventListener('input', ML.debounce(h2mConvert, 200));
  $('#h2mIn').addEventListener('paste', (e) => {
    const html = e.clipboardData && e.clipboardData.getData('text/html');
    if (html) {
      e.preventDefault();
      const ta = e.target;
      ta.setRangeText(html, ta.selectionStart, ta.selectionEnd, 'end');
      h2mConvert();
      ML.toast(t('h2m.richPasted'));
    }
  });
  ['#h2mHeading', '#h2mBullet', '#h2mEm', '#h2mCode'].forEach((s) => $(s).addEventListener('change', h2mConvert));
  h2mConvert();

  /* ==========================================================================
     Markdown → HTML
     ========================================================================== */
  let plainParser = null;
  function m2hConvert() {
    const md = $('#m2hIn').value;
    const mode = $('#m2hMode').value;
    let out;
    if (mode === 'doc') out = ML.exportHtml(md, 'Document');
    else if (mode === 'rich') out = ML.toHtml(md).html;
    else {
      if (!plainParser) plainParser = new window.marked.Marked({ gfm: true });
      const body = ML.splitFrontMatter(md).body;
      out = window.DOMPurify.sanitize(plainParser.parse(body));
    }
    $('#m2hOut').value = out.trim() + '\n';
  }
  $('#m2hIn').addEventListener('input', ML.debounce(m2hConvert, 200));
  $('#m2hMode').addEventListener('change', m2hConvert);
  $('#m2hDl').addEventListener('click', () => {
    const v = $('#m2hOut').value;
    ML.download('document.html', /^<!doctype/i.test(v) ? v : ML.exportHtml($('#m2hIn').value, 'Document'), 'text/html;charset=utf-8');
  });
  m2hConvert();

  /* ==========================================================================
     Diff
     ========================================================================== */
  let diffMode = 'lines';
  function diffRun() {
    const nl = (s) => (s && !s.endsWith('\n') ? s + '\n' : s);
    const a = nl($('#diffA').value), b = nl($('#diffB').value);
    const out = $('#diffOut'), sum = $('#diffSummary');
    out.innerHTML = '';
    if (!window.Diff) return;
    const ws = $('#diffWs').checked;
    let added = 0, removed = 0;
    if (diffMode === 'lines') {
      const parts = window.Diff.diffLines(a, b, { ignoreWhitespace: ws, newlineIsToken: false });
      let na = 1, nb = 1;
      const frag = document.createDocumentFragment();
      parts.forEach((p) => {
        const lines = p.value.replace(/\n$/, '').split('\n');
        lines.forEach((l) => {
          const row = document.createElement('div');
          row.className = 'diff-line' + (p.added ? ' add' : p.removed ? ' del' : '');
          const c1 = document.createElement('span'); c1.className = 'n';
          const c2 = document.createElement('span'); c2.className = 'n';
          const s = document.createElement('span'); s.className = 's';
          const txt = document.createElement('span'); txt.textContent = l || ' ';
          if (p.added) { c2.textContent = nb++; s.textContent = '+'; added++; }
          else if (p.removed) { c1.textContent = na++; s.textContent = '−'; removed++; }
          else { c1.textContent = na++; c2.textContent = nb++; }
          row.append(c1, c2, s, txt);
          frag.appendChild(row);
        });
      });
      out.appendChild(frag);
    } else {
      const parts = ws ? window.Diff.diffWords(a, b) : window.Diff.diffWordsWithSpace(a, b);
      const box = document.createElement('div');
      box.className = 'diff-words';
      parts.forEach((p) => {
        const s = document.createElement('span');
        s.textContent = p.value;
        if (p.added) { s.className = 'w-add'; added += p.count || 1; }
        if (p.removed) { s.className = 'w-del'; removed += p.count || 1; }
        box.appendChild(s);
      });
      out.appendChild(box);
    }
    sum.innerHTML = '';
    const mk = (cls, txt) => { const s = document.createElement('span'); s.className = cls; s.textContent = txt; sum.appendChild(s); };
    if (!added && !removed) mk('', a || b ? t('diff.same') : '');
    else { mk('a', '+' + added); mk('d', '−' + removed); mk('', t(diffMode === 'lines' ? 'diff.unitLines' : 'diff.unitWords')); }
  }
  const diffSoon = ML.debounce(diffRun, 200);
  $('#diffA').addEventListener('input', diffSoon);
  $('#diffB').addEventListener('input', diffSoon);
  $('#diffWs').addEventListener('change', diffRun);
  $('#diffSwap').addEventListener('click', () => {
    const a = $('#diffA').value; $('#diffA').value = $('#diffB').value; $('#diffB').value = a; diffRun();
  });
  $$('#diffMode button').forEach((b) => b.addEventListener('click', () => {
    diffMode = b.dataset.v;
    $$('#diffMode button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    diffRun();
  }));
  diffRun();

  /* ==========================================================================
     Lint & format
     ========================================================================== */
  function lint(md) {
    const issues = [];
    const add = (lvl, key, line, vars) => issues.push({ lvl, msg: t('lint.' + key, vars), line });
    const { lines, inCode, unclosed } = scanLines(md);
    const res = ML.toHtml(md);
    const slugs = new Set(res.headings.map((h) => h.slug));
    let lastLevel = 0, h1 = 0, trailing = 0, bullets = new Set();
    const seen = new Map();
    lines.forEach((line, i) => {
      const n = i + 1;
      if (/[ \t]+$/.test(line) && !/\S {2}$/.test(line)) trailing++;
      if (inCode[i]) return;
      const h = /^(#{1,6})(\s*)(.*?)\s*#*\s*$/.exec(line);
      if (/^#{1,6}[^\s#]/.test(line)) add('warn', 'hspace', n);
      if (/^#{1,6}\s/.test(line)) {
        const level = h[1].length;
        if (level === 1) h1++;
        if (!h[3].trim()) add('warn', 'emptyHeading', n);
        if (lastLevel && level > lastLevel + 1) add('warn', 'skip', n, { a: lastLevel, b: level });
        lastLevel = level;
        const key = h[3].trim().toLowerCase();
        if (key && seen.has(key)) add('info', 'dupHeading', n, { text: h[3].trim() });
        seen.set(key, n);
      }
      const bm = /^\s*([-*+])\s+/.exec(line);
      if (bm) bullets.add(bm[1]);
      const noCode = line.replace(/`[^`]*`/g, '');
      let m;
      const imgRe = /!\[([^\]]*)\]\(([^)\s]*)[^)]*\)/g;
      while ((m = imgRe.exec(noCode))) if (!m[1].trim()) add('warn', 'alt', n);
      const linkRe = /(?<!!)\[([^\]]*)\]\(([^)\s]*)[^)]*\)/g;
      while ((m = linkRe.exec(noCode))) {
        if (!m[1].trim()) add('warn', 'emptyText', n);
        if (!m[2]) add('warn', 'emptyUrl', n);
        else if (m[2].startsWith('#') && m[2].length > 1 && !slugs.has(decodeURIComponent(m[2].slice(1)))) add('warn', 'anchor', n, { a: m[2] });
        else if (/^http:\/\//i.test(m[2])) add('info', 'http', n);
      }
      const bare = noCode.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/<https?:[^>]+>/g, '');
      if (/(^|\s)https?:\/\/\S+/.test(bare) && !/^\s*\[[^\]]+\]:/.test(line)) add('info', 'bare', n);
      if (line.length > 160 && !/^\s*\|/.test(line)) add('info', 'long', n, { n: line.length });
    });
    if (h1 > 1) add('warn', 'multiH1', null, { n: h1 });
    if (unclosed) add('warn', 'fence', null);
    if (bullets.size > 1) add('info', 'bullets', null, { list: Array.from(bullets).join(' ') });
    if (trailing) add('info', 'trailing', null, { n: trailing });
    if (md && !md.endsWith('\n')) add('info', 'eof', null);
    return { issues, res };
  }

  function lintRun() {
    const md = $('#lintIn').value;
    const { issues, res } = lint(md);
    const s = res.stats;
    const count = (re) => (md.match(re) || []).length;
    const stats = [
      [s.words, t('lint.sWords')], [s.chars, t('lint.sChars')], [s.lines, t('lint.sLines')],
      [res.headings.length, t('lint.sHeadings')], [count(/(?<!!)\[[^\]]*\]\([^)]*\)/g), t('lint.sLinks')],
      [count(/!\[[^\]]*\]\([^)]*\)/g), t('lint.sImages')], [Math.floor(count(/^ {0,3}(```|~~~)/gm) / 2), t('lint.sCode')],
      [s.minutes + ' min', t('lint.sReading')],
    ];
    const grid = $('#lintStats');
    grid.innerHTML = '';
    stats.forEach(([v, l]) => {
      const d = document.createElement('div');
      const st = document.createElement('strong'); st.textContent = typeof v === 'number' ? ML.formatNumber(v) : v;
      const sp = document.createElement('span'); sp.textContent = l;
      d.append(st, sp); grid.appendChild(d);
    });
    const list = $('#lintList');
    list.innerHTML = '';
    const items = issues.length ? issues : (md.trim() ? [{ lvl: 'ok', msg: t('lint.ok') }] : []);
    items.forEach((it) => {
      const li = document.createElement('li');
      const lv = document.createElement('span'); lv.className = 'lvl ' + it.lvl; lv.textContent = t('lint.lvl.' + it.lvl);
      const msg = document.createElement('span'); msg.textContent = it.msg;
      li.append(lv, msg);
      if (it.line) {
        const ln = document.createElement('button');
        ln.type = 'button'; ln.className = 'ln btn btn-ghost btn-sm'; ln.textContent = t('lint.line', { n: it.line });
        ln.addEventListener('click', () => goToLine(it.line));
        li.appendChild(ln);
      }
      list.appendChild(li);
    });
  }
  function goToLine(n) {
    const ta = $('#lintIn');
    const lines = ta.value.split('\n');
    const pos = lines.slice(0, n - 1).reduce((a, l) => a + l.length + 1, 0);
    ta.focus();
    ta.setSelectionRange(pos, pos + (lines[n - 1] || '').length);
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    ta.scrollTop = Math.max(0, (n - 4) * lh);
  }

  function format(md) {
    const on = (k) => $('[data-fix="' + k + '"]').checked;
    let { lines, inCode } = scanLines(md.replace(/\r\n?/g, '\n'));
    let out = [];
    for (let i = 0; i < lines.length; i++) {
      let l = lines[i];
      if (inCode[i]) { out.push(l); continue; }
      if (on('trailing')) l = /\S {2}$/.test(l) ? l.replace(/\s+$/, '  ') : l.replace(/[ \t]+$/, '');
      if (on('hspace')) l = l.replace(/^(#{1,6})([^\s#])/, '$1 $2');
      if (on('bullets')) l = l.replace(/^(\s*)[*+](\s+)/, '$1-$2');
      if (on('atx') && i + 1 < lines.length && !inCode[i + 1] && l.trim() && !/^\s*([-*+]\s|#|>|\|)/.test(l)) {
        const u = /^(=+|-+)\s*$/.exec(lines[i + 1]);
        if (u && (u[1][0] === '=' || l.trim())) {
          const prevBlank = i === 0 || !out.length || !out[out.length - 1].trim();
          if (prevBlank) { out.push((u[1][0] === '=' ? '# ' : '## ') + l.trim()); i++; continue; }
        }
      }
      out.push(l);
    }
    if (on('hblank')) {
      const res = [];
      const codeAfter = scanLines(out.join('\n')).inCode;
      out.forEach((l, i) => {
        const isH = !codeAfter[i] && /^#{1,6}\s/.test(l);
        if (isH && res.length && res[res.length - 1].trim()) res.push('');
        res.push(l);
        if (isH && i + 1 < out.length && out[i + 1].trim()) res.push('');
      });
      out = res;
    }
    let text = out.join('\n');
    if (on('blank')) {
      const sc = scanLines(text);
      const res = [];
      sc.lines.forEach((l, i) => { if (!sc.inCode[i] && !l.trim() && res.length && !res[res.length - 1].trim()) return; res.push(l); });
      text = res.join('\n').replace(/^\n+/, '');
    }
    if (on('eof')) text = text.replace(/\n*$/, '\n');
    return text;
  }

  $('#lintIn').addEventListener('input', ML.debounce(lintRun, 250));
  $('#lintFormat').addEventListener('click', () => {
    const ta = $('#lintIn');
    const before = ta.value;
    const after = format(before);
    if (after === before) { ML.toast(t('fix.nothing')); return; }
    ta.focus();
    ta.select();
    if (!document.execCommand('insertText', false, after)) ta.value = after; // keeps Ctrl+Z
    ta.dispatchEvent(new Event('input'));
    ML.toast(t('fix.done'));
  });
  lintRun();

  document.addEventListener('marklight:lang', () => { tbBuild(); tocBuild(); diffRun(); lintRun(); });
})();
