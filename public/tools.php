<?php
/** Marklight – Tools. Engineered by EinfachDev · GPL-3.0-or-later */
declare(strict_types=1);

namespace Marklight;

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/layout.php';

page_start([
    'title'       => 'Tools · Marklight',
    'title_key'   => 'nav.tools',
    'description' => 'Markdown table generator, TOC generator, HTML↔Markdown converter, diff, linter and formatter.',
    'page'        => 'tools',
    'app'         => true,
    'styles'      => ['vendor/katex/katex.min.css'],
    'scripts'     => [
        'vendor/marked/marked.umd.js',
        'vendor/dompurify/purify.min.js',
        'vendor/highlight/highlight.min.js',
        'vendor/katex/katex.min.js',
        'vendor/turndown/turndown.browser.umd.js',
        'vendor/turndown/turndown-plugin-gfm.js',
        'vendor/diff/diff.min.js',
        'assets/js/tools.js',
    ],
]);

$tools = [
    'table'   => 'table',
    'toc'     => 'list-tree',
    'html2md' => 'arrow-left-right',
    'md2html' => 'file-code',
    'diff'    => 'diff',
    'lint'    => 'wand',
];
?>
  <div class="app-body">
    <div class="tools-layout">
      <nav class="tools-nav" aria-label="Tools">
        <h2 data-i18n="nav.tools">Tools</h2>
<?php foreach ($tools as $id => $icon): ?>
        <a href="#<?= e($id) ?>" data-tool="<?= e($id) ?>"><i data-icon="<?= e($icon) ?>"></i><span data-i18n="tool.<?= e($id) ?>.t"><?= e($id) ?></span></a>
<?php endforeach; ?>
        <div class="credit" style="border:0;margin-top:12px"><?= engineered_by() ?></div>
      </nav>

      <main class="tools-main" id="main">

        <!-- ============ Table generator ============ -->
        <section class="tool" id="tool-table" hidden>
          <div class="tool-head"><h1 data-i18n="tool.table.t">Table generator</h1><p data-i18n="tool.table.d">Build tables visually or paste from Excel / CSV.</p></div>
          <div class="tb-actions">
            <button class="btn btn-sm" type="button" id="tbAddRow"><i data-icon="plus"></i><span data-i18n="tb.addRow">Row</span></button>
            <button class="btn btn-sm" type="button" id="tbAddCol"><i data-icon="plus"></i><span data-i18n="tb.addCol">Column</span></button>
            <button class="btn btn-sm" type="button" id="tbImport"><i data-icon="upload"></i><span data-i18n="tb.import">Import CSV / Excel / Markdown…</span></button>
            <button class="btn btn-sm" type="button" id="tbTranspose"><i data-icon="refresh"></i><span data-i18n="tb.transpose">Transpose</span></button>
            <button class="btn btn-sm btn-ghost" type="button" id="tbClear"><i data-icon="trash"></i><span data-i18n="tb.clear">Clear</span></button>
            <label class="check" style="margin-left:auto"><input type="checkbox" id="tbPretty" checked> <span data-i18n="tb.pretty">Align columns</span></label>
          </div>
          <div class="tb-wrap"><table class="tb" id="tbGrid"></table></div>
          <div class="tool-grid" style="margin-top:18px">
            <div class="tool-col">
              <div class="head"><h3>Markdown</h3><button class="btn btn-sm" type="button" data-copy="#tbOut"><i data-icon="copy"></i><span data-i18n="common.copy">Copy</span></button></div>
              <textarea class="textarea" id="tbOut" readonly spellcheck="false"></textarea>
            </div>
            <div class="tool-col">
              <div class="head"><h3 data-i18n="common.preview">Preview</h3></div>
              <div class="result-box markdown-body" id="tbPreview"></div>
            </div>
          </div>
        </section>

        <!-- ============ TOC generator ============ -->
        <section class="tool" id="tool-toc" hidden>
          <div class="tool-head"><h1 data-i18n="tool.toc.t">TOC generator</h1><p data-i18n="tool.toc.d">GitHub-compatible table of contents with anchors.</p></div>
          <div class="opts">
            <label class="field"><span data-i18n="toc.min">From level</span><select class="select" id="tocMin"><option>1</option><option selected>2</option><option>3</option></select></label>
            <label class="field"><span data-i18n="toc.max">to</span><select class="select" id="tocMax"><option>2</option><option selected>3</option><option>4</option><option>5</option><option>6</option></select></label>
            <label class="field"><span data-i18n="toc.style">Style</span><select class="select" id="tocStyle"><option value="-">- bullets</option><option value="*">* bullets</option><option value="1.">1. numbered</option></select></label>
            <label class="check"><input type="checkbox" id="tocLinks" checked> <span data-i18n="toc.links">Links</span></label>
            <label class="check"><input type="checkbox" id="tocMarkers" checked> <span data-i18n="toc.markers">&lt;!-- toc --&gt; markers</span></label>
          </div>
          <div class="tool-grid">
            <div class="tool-col">
              <div class="head"><h3 data-i18n="common.input">Markdown input</h3><button class="btn btn-sm" type="button" data-load-draft="#tocIn"><i data-icon="pen"></i><span data-i18n="common.fromEditor">From editor</span></button></div>
              <textarea class="textarea" id="tocIn" spellcheck="false" data-i18n-placeholder="common.pasteMd"></textarea>
            </div>
            <div class="tool-col">
              <div class="head"><h3 data-i18n="toc.result">Table of contents</h3>
                <span><button class="btn btn-sm" type="button" id="tocInsert"><i data-icon="arrow-left-right"></i><span data-i18n="toc.insert">Insert into document</span></button>
                <button class="btn btn-sm" type="button" data-copy="#tocOut"><i data-icon="copy"></i><span data-i18n="common.copy">Copy</span></button></span></div>
              <textarea class="textarea" id="tocOut" readonly spellcheck="false"></textarea>
            </div>
          </div>
        </section>

        <!-- ============ HTML → Markdown ============ -->
        <section class="tool" id="tool-html2md" hidden>
          <div class="tool-head"><h1 data-i18n="tool.html2md.t">HTML → Markdown</h1><p data-i18n="h2m.lead">Paste HTML source – or copy formatted text from a website or Word and paste it here.</p></div>
          <div class="opts">
            <label class="field"><span data-i18n="h2m.headings">Headings</span><select class="select" id="h2mHeading"><option value="atx"># ATX</option><option value="setext">Setext ===</option></select></label>
            <label class="field"><span data-i18n="h2m.bullets">Bullets</span><select class="select" id="h2mBullet"><option>-</option><option>*</option><option>+</option></select></label>
            <label class="field"><span data-i18n="h2m.em">Emphasis</span><select class="select" id="h2mEm"><option>_</option><option>*</option></select></label>
            <label class="field"><span data-i18n="h2m.code">Code blocks</span><select class="select" id="h2mCode"><option value="fenced">```fenced```</option><option value="indented">indented</option></select></label>
          </div>
          <div class="tool-grid">
            <div class="tool-col">
              <div class="head"><h3>HTML</h3></div>
              <textarea class="textarea" id="h2mIn" spellcheck="false" placeholder="&lt;h1&gt;Hello&lt;/h1&gt;&lt;p&gt;World&lt;/p&gt;"></textarea>
            </div>
            <div class="tool-col">
              <div class="head"><h3>Markdown</h3>
                <span><button class="btn btn-sm" type="button" data-to-editor="#h2mOut"><i data-icon="pen"></i><span data-i18n="common.toEditor">To editor</span></button>
                <button class="btn btn-sm" type="button" data-copy="#h2mOut"><i data-icon="copy"></i><span data-i18n="common.copy">Copy</span></button></span></div>
              <textarea class="textarea" id="h2mOut" readonly spellcheck="false"></textarea>
            </div>
          </div>
        </section>

        <!-- ============ Markdown → HTML ============ -->
        <section class="tool" id="tool-md2html" hidden>
          <div class="tool-head"><h1 data-i18n="tool.md2html.t">Markdown → HTML</h1><p data-i18n="tool.md2html.d">Get sanitized HTML for blogs, CMS or e-mails.</p></div>
          <div class="opts">
            <label class="field"><span data-i18n="m2h.mode">Output</span><select class="select" id="m2hMode">
              <option value="clean" data-i18n="m2h.clean">Clean HTML fragment</option>
              <option value="rich" data-i18n="m2h.rich">With anchors &amp; highlighting</option>
              <option value="doc" data-i18n="m2h.doc">Complete HTML document</option>
            </select></label>
          </div>
          <div class="tool-grid">
            <div class="tool-col">
              <div class="head"><h3>Markdown</h3><button class="btn btn-sm" type="button" data-load-draft="#m2hIn"><i data-icon="pen"></i><span data-i18n="common.fromEditor">From editor</span></button></div>
              <textarea class="textarea" id="m2hIn" spellcheck="false" data-i18n-placeholder="common.pasteMd"></textarea>
            </div>
            <div class="tool-col">
              <div class="head"><h3>HTML</h3>
                <span><button class="btn btn-sm" type="button" id="m2hDl"><i data-icon="download"></i>.html</button>
                <button class="btn btn-sm" type="button" data-copy="#m2hOut"><i data-icon="copy"></i><span data-i18n="common.copy">Copy</span></button></span></div>
              <textarea class="textarea" id="m2hOut" readonly spellcheck="false"></textarea>
            </div>
          </div>
        </section>

        <!-- ============ Diff ============ -->
        <section class="tool" id="tool-diff" hidden>
          <div class="tool-head"><h1 data-i18n="tool.diff.t">Diff</h1><p data-i18n="tool.diff.d">Compare two versions line by line or word by word.</p></div>
          <div class="opts">
            <div class="segmented" id="diffMode">
              <button type="button" data-v="lines" aria-pressed="true" data-i18n="diff.lines">Lines</button>
              <button type="button" data-v="words" aria-pressed="false" data-i18n="diff.words">Words</button>
            </div>
            <label class="check"><input type="checkbox" id="diffWs"> <span data-i18n="diff.ignoreWs">Ignore whitespace</span></label>
            <button class="btn btn-sm" type="button" id="diffSwap"><i data-icon="arrow-left-right"></i><span data-i18n="diff.swap">Swap</span></button>
          </div>
          <div class="tool-grid">
            <div class="tool-col">
              <div class="head"><h3 data-i18n="diff.a">Original</h3></div>
              <textarea class="textarea" id="diffA" spellcheck="false" style="min-height:220px"></textarea>
            </div>
            <div class="tool-col">
              <div class="head"><h3 data-i18n="diff.b">Changed</h3></div>
              <textarea class="textarea" id="diffB" spellcheck="false" style="min-height:220px"></textarea>
            </div>
          </div>
          <div style="margin-top:18px">
            <div class="diff-summary" id="diffSummary"></div>
            <div class="diff-out" id="diffOut"></div>
          </div>
        </section>

        <!-- ============ Lint & format ============ -->
        <section class="tool" id="tool-lint" hidden>
          <div class="tool-head"><h1 data-i18n="tool.lint.t">Lint &amp; format</h1><p data-i18n="tool.lint.d">Find broken anchors, missing alt texts and tidy up formatting.</p></div>
          <div class="opts">
            <label class="check"><input type="checkbox" data-fix="trailing" checked> <span data-i18n="fix.trailing">Trim trailing spaces</span></label>
            <label class="check"><input type="checkbox" data-fix="blank" checked> <span data-i18n="fix.blank">Collapse blank lines</span></label>
            <label class="check"><input type="checkbox" data-fix="atx" checked> <span data-i18n="fix.atx">Setext → # headings</span></label>
            <label class="check"><input type="checkbox" data-fix="hspace" checked> <span data-i18n="fix.hspace">Space after #</span></label>
            <label class="check"><input type="checkbox" data-fix="hblank" checked> <span data-i18n="fix.hblank">Blank lines around headings</span></label>
            <label class="check"><input type="checkbox" data-fix="bullets" checked> <span data-i18n="fix.bullets">Unify bullets to “-”</span></label>
            <label class="check"><input type="checkbox" data-fix="eof" checked> <span data-i18n="fix.eof">Newline at end</span></label>
            <button class="btn btn-primary btn-sm" type="button" id="lintFormat"><i data-icon="wand"></i><span data-i18n="fix.apply">Format</span></button>
          </div>
          <div class="tool-grid">
            <div class="tool-col">
              <div class="head"><h3>Markdown</h3>
                <span><button class="btn btn-sm" type="button" data-load-draft="#lintIn"><i data-icon="pen"></i><span data-i18n="common.fromEditor">From editor</span></button>
                <button class="btn btn-sm" type="button" data-copy="#lintIn"><i data-icon="copy"></i><span data-i18n="common.copy">Copy</span></button></span></div>
              <textarea class="textarea" id="lintIn" spellcheck="false" data-i18n-placeholder="common.pasteMd"></textarea>
            </div>
            <div class="tool-col">
              <div class="head"><h3 data-i18n="lint.report">Report</h3></div>
              <div class="stat-grid" id="lintStats"></div>
              <ul class="lint-list" id="lintList"></ul>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>
</body>
</html>
