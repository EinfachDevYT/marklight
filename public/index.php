<?php
/** Marklight – landing page. Engineered by EinfachDev · GPL-3.0-or-later */
declare(strict_types=1);

namespace Marklight;

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/layout.php';

page_start([
    'title' => 'Marklight · Markdown reader, editor & toolbox',
    'page'  => 'home',
]);
?>
  <main id="main">
    <section class="hero">
      <div class="container">
        <div>
          <span class="eyebrow"><span class="dot"></span><span data-i18n="hero.eyebrow">Open source · No tracking · Self-hostable</span></span>
          <h1 data-i18n-html="hero.title">Markdown, <span class="hl">beautifully</span> read.</h1>
          <p class="lead" data-i18n="hero.lead">Marklight opens, edits and transforms Markdown files right in your browser. Nothing is uploaded – your documents never leave your device.</p>
          <div class="cta">
            <a class="btn btn-primary btn-lg" href="reader"><i data-icon="book-open"></i><span data-i18n="hero.open">Open a file</span></a>
            <a class="btn btn-lg" href="editor"><i data-icon="pen"></i><span data-i18n="hero.write">Start writing</span></a>
            <a class="btn btn-lg btn-ghost" href="reader?demo"><span data-i18n="hero.demo">View demo</span><i data-icon="arrow-right"></i></a>
          </div>
          <div class="trust">
            <span><i data-icon="check"></i><span data-i18n="hero.t1">No sign-up</span></span>
            <span><i data-icon="check"></i><span data-i18n="hero.t2">Works offline</span></span>
            <span><i data-icon="check"></i><span data-i18n="hero.t3">Free &amp; GPL-3.0</span></span>
          </div>
        </div>
        <div class="mock" aria-hidden="true">
          <div class="mock-bar"><i></i><i></i><i></i></div>
          <div class="mock-body">
            <div class="mock-src"><span class="t"># Release notes</span>

Marklight is **fast**,
private and *offline*.

- [x] Reader
- [x] Editor
- [ ] Your idea?

| Tool  | Status |
|-------|--------|
| TOC   | ✓      |
| Diff  | ✓      |

$E = mc^2$</div>
            <div class="mock-out">
              <h3>Release notes</h3>
              <div>Marklight is <strong>fast</strong>, private and <em>offline</em>.</div>
              <ul>
                <li>☑ Reader</li>
                <li>☑ Editor</li>
                <li>☐ Your idea?</li>
              </ul>
              <table><thead><tr><th>Tool</th><th>Status</th></tr></thead><tbody><tr><td>TOC</td><td>✓</td></tr><tr><td>Diff</td><td>✓</td></tr></tbody></table>
              <p class="mock-math">E = mc²</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-alt" id="features">
      <div class="container">
        <div class="section-head">
          <h2 data-i18n="feat.title">Everything you need for Markdown</h2>
          <p data-i18n="feat.lead">From quick reading to full documentation folders – Marklight renders what GitHub renders, and a bit more.</p>
        </div>
        <div class="grid-3">
          <div class="card"><div class="ico"><i data-icon="book-open"></i></div><h3 data-i18n="feat.reader.t">Distraction-free reader</h3><p data-i18n="feat.reader.d">Table of contents with scroll-spy, reading progress, light/dark/sepia themes and adjustable typography.</p></div>
          <div class="card"><div class="ico"><i data-icon="folder-open"></i></div><h3 data-i18n="feat.folder.t">Open whole folders</h3><p data-i18n="feat.folder.d">Browse a docs folder like a website – relative links and images between files just work.</p></div>
          <div class="card"><div class="ico"><i data-icon="pen"></i></div><h3 data-i18n="feat.editor.t">Live editor</h3><p data-i18n="feat.editor.d">Split view with synced scrolling, formatting toolbar, shortcuts, smart lists and autosave.</p></div>
          <div class="card"><div class="ico"><i data-icon="sigma"></i></div><h3 data-i18n="feat.ext.t">Math, diagrams &amp; more</h3><p data-i18n="feat.ext.d">KaTeX formulas, Mermaid diagrams, syntax highlighting, footnotes, task lists and GitHub alerts.</p></div>
          <div class="card"><div class="ico"><i data-icon="share"></i></div><h3 data-i18n="feat.share.t">Serverless sharing</h3><p data-i18n="feat.share.d">Share a document as a compressed link. The content lives in the URL fragment – no server ever sees it.</p></div>
          <div class="card"><div class="ico"><i data-icon="download"></i></div><h3 data-i18n="feat.export.t">Export anywhere</h3><p data-i18n="feat.export.d">Download as Markdown or standalone HTML, print to PDF, or present your document as slides.</p></div>
        </div>
      </div>
    </section>

    <section class="section" id="tools">
      <div class="container">
        <div class="section-head">
          <h2 data-i18n="toolsec.title">Handy tools included</h2>
          <p data-i18n="toolsec.lead">Small, focused helpers for everyday Markdown work.</p>
        </div>
        <div class="grid-3">
          <a class="card" href="tools#table"><div class="ico"><i data-icon="table"></i></div><h3 data-i18n="tool.table.t">Table generator</h3><p data-i18n="tool.table.d">Build tables visually or paste from Excel / CSV.</p></a>
          <a class="card" href="tools#toc"><div class="ico"><i data-icon="list-tree"></i></div><h3 data-i18n="tool.toc.t">TOC generator</h3><p data-i18n="tool.toc.d">GitHub-compatible table of contents with anchors.</p></a>
          <a class="card" href="tools#html2md"><div class="ico"><i data-icon="arrow-left-right"></i></div><h3 data-i18n="tool.html2md.t">HTML → Markdown</h3><p data-i18n="tool.html2md.d">Convert HTML or rich text from websites into clean Markdown.</p></a>
          <a class="card" href="tools#md2html"><div class="ico"><i data-icon="file-code"></i></div><h3 data-i18n="tool.md2html.t">Markdown → HTML</h3><p data-i18n="tool.md2html.d">Get sanitized HTML for blogs, CMS or e-mails.</p></a>
          <a class="card" href="tools#diff"><div class="ico"><i data-icon="diff"></i></div><h3 data-i18n="tool.diff.t">Diff</h3><p data-i18n="tool.diff.d">Compare two versions line by line or word by word.</p></a>
          <a class="card" href="tools#lint"><div class="ico"><i data-icon="wand"></i></div><h3 data-i18n="tool.lint.t">Lint &amp; format</h3><p data-i18n="tool.lint.d">Find broken anchors, missing alt texts and tidy up formatting.</p></a>
        </div>
      </div>
    </section>

    <section class="section section-alt" id="selfhost">
      <div class="container">
        <div class="section-head">
          <h2 data-i18n="host.title">Host it yourself in one minute</h2>
          <p data-i18n="host.lead">Marklight needs nothing but PHP 8.1+. No database, no Composer, no build step.</p>
        </div>
        <div class="host-grid">
          <div class="code-card">
            <header><i data-icon="box"></i> Docker <span class="tag">PHP 8.3 · Apache</span></header>
<pre><span class="c"># build &amp; run</span>
git clone <?= e(REPO_URL) ?>.git
cd marklight
docker compose up -d
<span class="c"># → http://localhost:8080</span></pre>
          </div>
          <div class="code-card">
            <header><i data-icon="server"></i> <span data-i18n="host.static">Any PHP web host</span> <span class="tag">Apache · nginx · Shared hosting</span></header>
<pre><span class="c"># document root → public/</span>
git clone <?= e(REPO_URL) ?>.git
<span class="c"># or try it locally</span>
php -S localhost:8080 -t public</pre>
          </div>
        </div>
        <div class="privacy">
          <div><strong>0</strong><span data-i18n="priv.1">trackers, cookies or analytics</span></div>
          <div><strong>0</strong><span data-i18n="priv.2">databases – nothing is stored on the server</span></div>
          <div><strong>CSP</strong><span data-i18n="priv.3">strict security headers, no inline scripts, no CDNs</span></div>
          <div><strong>PWA</strong><span data-i18n="priv.4">installable and usable offline</span></div>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container">
        <h2 data-i18n="cta.title">Ready to read?</h2>
        <p data-i18n="cta.lead">Drop a Markdown file into the reader – or just start typing.</p>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="reader"><i data-icon="book-open"></i><span data-i18n="nav.reader">Reader</span></a>
          <a class="btn btn-lg" href="editor"><i data-icon="pen"></i><span data-i18n="nav.editor">Editor</span></a>
          <a class="btn btn-lg" href="tools"><i data-icon="wrench"></i><span data-i18n="nav.tools">Tools</span></a>
        </div>
      </div>
    </section>
  </main>
<?php page_end();
