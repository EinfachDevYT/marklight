<?php
/** Marklight – Reader. Engineered by EinfachDev · GPL-3.0-or-later */
declare(strict_types=1);

namespace Marklight;

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/layout.php';

page_start([
    'title'       => 'Reader · Marklight',
    'title_key'   => 'nav.reader',
    'description' => 'Open and read Markdown files, folders and URLs in your browser – privately and offline.',
    'page'        => 'reader',
    'app'         => true,
    'styles'      => ['vendor/katex/katex.min.css'],
    'scripts'     => [
        'vendor/marked/marked.umd.js',
        'vendor/dompurify/purify.min.js',
        'vendor/highlight/highlight.min.js',
        'vendor/katex/katex.min.js',
        'assets/js/reader.js',
    ],
]);
?>
  <div class="app-body">
    <div class="reader-layout" id="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-tabs" role="tablist">
          <button role="tab" aria-selected="true" data-tab="toc" data-i18n="reader.contents">Contents</button>
          <button role="tab" aria-selected="false" data-tab="files" data-i18n="reader.files">Files</button>
        </div>
        <div class="sidebar-panel" id="panel-toc" role="tabpanel">
          <ul class="toc" id="toc"></ul>
          <p class="empty-hint" id="tocEmpty" data-i18n="reader.noHeadings">No headings found.</p>
        </div>
        <div class="sidebar-panel" id="panel-files" role="tabpanel" hidden>
          <ul class="file-list" id="fileList"></ul>
          <p class="empty-hint" id="filesEmpty" data-i18n="reader.noFiles">Open a folder or several files to browse them here.</p>
        </div>
        <div class="doc-meta" id="docMeta" hidden></div>
        <div class="credit"><?= engineered_by() ?></div>
      </aside>

      <main class="reader-main" id="main">
        <div class="toolbar">
          <button class="btn btn-ghost btn-icon btn-sm" id="sidebarBtn" type="button" data-i18n-title="reader.toggleSidebar"><i data-icon="sidebar"></i></button>
          <div class="menu-wrap">
            <button class="btn btn-sm" type="button" data-menu="openMenu" aria-haspopup="true" aria-expanded="false"><i data-icon="folder-open"></i><span data-i18n="reader.open">Open</span></button>
            <div class="menu menu-left" id="openMenu" hidden>
              <button type="button" data-act="file"><i data-icon="file-text"></i><span data-i18n="reader.openFile">File(s)…</span></button>
              <button type="button" data-act="folder"><i data-icon="folder"></i><span data-i18n="reader.openFolder">Folder…</span></button>
              <button type="button" data-act="url"><i data-icon="link"></i><span data-i18n="reader.openUrl">From URL…</span></button>
              <button type="button" data-act="paste"><i data-icon="clipboard"></i><span data-i18n="reader.paste">Paste text…</span></button>
              <hr>
              <button type="button" data-act="demo"><i data-icon="zap"></i><span data-i18n="reader.demo">Demo document</span></button>
              <button type="button" data-act="close"><i data-icon="x"></i><span data-i18n="reader.close">Close document</span></button>
            </div>
          </div>
          <span class="title" id="docTitle"></span>
          <span class="spacer"></span>
          <div class="menu-wrap">
            <button class="btn btn-ghost btn-icon btn-sm" type="button" data-menu="viewMenu" data-i18n-title="reader.display" aria-haspopup="true" aria-expanded="false"><i data-icon="type"></i></button>
            <div class="menu panel-settings" id="viewMenu" hidden>
              <h4 data-i18n="theme.label">Theme</h4>
              <div class="swatches">
                <button class="swatch" type="button" data-v="auto" data-i18n-title="theme.auto"></button>
                <button class="swatch" type="button" data-v="light" data-i18n-title="theme.light"></button>
                <button class="swatch" type="button" data-v="sepia" data-i18n-title="theme.sepia"></button>
                <button class="swatch" type="button" data-v="dark" data-i18n-title="theme.dark"></button>
              </div>
              <h4 data-i18n="reader.font">Font</h4>
              <div class="segmented" id="fontSeg">
                <button type="button" data-v="sans" data-i18n="reader.fontSans">Sans</button>
                <button type="button" data-v="serif" data-i18n="reader.fontSerif">Serif</button>
                <button type="button" data-v="mono" data-i18n="reader.fontMono">Mono</button>
              </div>
              <label class="field"><span><span data-i18n="reader.size">Size</span> · <output id="sizeOut">17</output> px</span><input type="range" id="sizeRange" min="13" max="24" step="1"></label>
              <label class="field"><span><span data-i18n="reader.width">Line width</span> · <output id="widthOut">760</output> px</span><input type="range" id="widthRange" min="560" max="1200" step="20"></label>
              <label class="check"><input type="checkbox" id="mathChk"> <span data-i18n="reader.math">Render math (KaTeX)</span></label>
              <label class="check"><input type="checkbox" id="mermaidChk"> <span data-i18n="reader.mermaid">Render Mermaid diagrams</span></label>
            </div>
          </div>
          <button class="btn btn-ghost btn-icon btn-sm hide-sm" id="presentBtn" type="button" data-i18n-title="reader.present"><i data-icon="presentation"></i></button>
          <button class="btn btn-ghost btn-icon btn-sm hide-sm" id="fullBtn" type="button" data-i18n-title="reader.fullscreen"><i data-icon="maximize"></i></button>
          <div class="menu-wrap">
            <button class="btn btn-sm" type="button" data-menu="exportMenu" aria-haspopup="true" aria-expanded="false"><i data-icon="download"></i><span class="hide-sm" data-i18n="reader.export">Export</span></button>
            <div class="menu" id="exportMenu" hidden>
              <button type="button" data-act="share"><i data-icon="share"></i><span data-i18n="reader.share">Share as link…</span></button>
              <button type="button" data-act="edit"><i data-icon="pen"></i><span data-i18n="reader.edit">Edit in editor</span></button>
              <hr>
              <button type="button" data-act="dl-md"><i data-icon="file-text"></i><span data-i18n="reader.dlMd">Download .md</span></button>
              <button type="button" data-act="dl-html"><i data-icon="file-code"></i><span data-i18n="reader.dlHtml">Download .html</span></button>
              <button type="button" data-act="copy-html"><i data-icon="copy"></i><span data-i18n="reader.copyHtml">Copy HTML</span></button>
              <button type="button" data-act="copy-md"><i data-icon="copy"></i><span data-i18n="reader.copyMd">Copy Markdown</span></button>
              <button type="button" data-act="print"><i data-icon="printer"></i><span data-i18n="reader.print">Print / PDF</span></button>
            </div>
          </div>
        </div>
        <div class="progress" aria-hidden="true"><i id="progress"></i></div>

        <div class="reader-scroll" id="scroller">
          <section class="dropzone" id="dropzone">
            <div class="drop-ico"><i data-icon="upload"></i></div>
            <h1 data-i18n="reader.dropTitle">Drop a Markdown file here</h1>
            <p data-i18n="reader.dropText">…or a whole folder. Files are read locally and never uploaded.</p>
            <div class="actions">
              <button class="btn btn-primary" type="button" data-act="file"><i data-icon="file-text"></i><span data-i18n="reader.openFile">File(s)…</span></button>
              <button class="btn" type="button" data-act="folder"><i data-icon="folder"></i><span data-i18n="reader.openFolder">Folder…</span></button>
              <button class="btn" type="button" data-act="paste"><i data-icon="clipboard"></i><span data-i18n="reader.paste">Paste text…</span></button>
              <button class="btn btn-ghost" type="button" data-act="demo"><i data-icon="zap"></i><span data-i18n="reader.demo">Demo document</span></button>
            </div>
            <form class="url-row" id="urlForm">
              <input class="input" type="url" id="urlInput" data-i18n-placeholder="reader.urlPlaceholder" placeholder="https://github.com/user/repo/blob/main/README.md" required>
              <button class="btn" type="submit"><i data-icon="link"></i><span data-i18n="reader.load">Load</span></button>
            </form>
            <div class="recent" id="recent" hidden>
              <h2><span data-i18n="reader.recent">Recently opened</span><button class="btn btn-ghost btn-sm" type="button" id="clearRecent" data-i18n="reader.clear">Clear</button></h2>
              <ul id="recentList"></ul>
            </div>
          </section>
          <article class="reader-content markdown-body" id="content" hidden></article>
        </div>
      </main>
    </div>
  </div>

  <input type="file" id="fileInput" accept=".md,.markdown,.mdown,.mkd,.mkdn,.mdx,.txt,text/markdown,text/plain" multiple hidden>
  <input type="file" id="folderInput" webkitdirectory directory multiple hidden>

</body>
</html>
