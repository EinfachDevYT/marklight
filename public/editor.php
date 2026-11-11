<?php
/** Marklight – Editor. Engineered by EinfachDev · GPL-3.0-or-later */
declare(strict_types=1);

namespace Marklight;

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/layout.php';

page_start([
    'title'       => 'Editor · Marklight',
    'title_key'   => 'nav.editor',
    'description' => 'Write Markdown with live preview, autosave and export – entirely in your browser.',
    'page'        => 'editor',
    'app'         => true,
    'styles'      => ['vendor/katex/katex.min.css'],
    'scripts'     => [
        'vendor/marked/marked.umd.js',
        'vendor/dompurify/purify.min.js',
        'vendor/highlight/highlight.min.js',
        'vendor/katex/katex.min.js',
        'assets/js/editor.js',
    ],
]);

$fmt = [
    ['bold', 'bold', 'ed.bold', 'Ctrl+B'],
    ['italic', 'italic', 'ed.italic', 'Ctrl+I'],
    ['strike', 'strike', 'ed.strike', ''],
    ['heading', 'heading', 'ed.heading', 'Ctrl+H'],
    ['|'],
    ['link', 'link', 'ed.link', 'Ctrl+K'],
    ['image', 'image', 'ed.image', ''],
    ['code', 'code', 'ed.code', 'Ctrl+E'],
    ['codeblock', 'code-block', 'ed.codeblock', ''],
    ['|'],
    ['quote', 'quote', 'ed.quote', ''],
    ['ul', 'list', 'ed.ul', ''],
    ['ol', 'list-ordered', 'ed.ol', ''],
    ['task', 'check-square', 'ed.task', ''],
    ['table', 'table', 'ed.table', ''],
    ['hr', 'minus', 'ed.hr', ''],
];
?>
  <div class="app-body">
    <div class="editor-wrap" id="main">
      <div class="toolbar">
        <div class="md-toolbar" role="toolbar" aria-label="Formatting">
<?php foreach ($fmt as $b): ?>
<?php if ($b[0] === '|'): ?>
          <span class="sep hide-sm"></span>
<?php else: ?>
          <button class="btn btn-ghost btn-icon btn-sm" type="button" data-fmt="<?= e($b[0]) ?>" data-i18n-title="<?= e($b[2]) ?>" data-kbd="<?= e($b[3]) ?>"><i data-icon="<?= e($b[1]) ?>"></i></button>
<?php endif; ?>
<?php endforeach; ?>
        </div>
        <span class="spacer"></span>
        <input class="input" id="docName" type="text" spellcheck="false" aria-label="File name" style="width:180px;min-height:30px">
        <div class="segmented" id="viewSeg" role="group">
          <button type="button" data-v="edit" data-i18n-title="ed.viewEdit"><i data-icon="pen"></i></button>
          <button type="button" data-v="split" data-i18n-title="ed.viewSplit"><i data-icon="columns"></i></button>
          <button type="button" data-v="preview" data-i18n-title="ed.viewPreview"><i data-icon="eye"></i></button>
        </div>
        <div class="menu-wrap">
          <button class="btn btn-sm" type="button" data-menu="fileMenu" aria-haspopup="true" aria-expanded="false"><i data-icon="file"></i><span class="hide-sm" data-i18n="ed.file">File</span></button>
          <div class="menu" id="fileMenu" hidden>
            <button type="button" data-act="new"><i data-icon="file-plus"></i><span data-i18n="ed.new">New document</span></button>
            <button type="button" data-act="open"><i data-icon="folder-open"></i><span data-i18n="ed.open">Open file…</span></button>
            <hr>
            <button type="button" data-act="dl-md"><i data-icon="download"></i><span data-i18n="reader.dlMd">Download .md</span></button>
            <button type="button" data-act="dl-html"><i data-icon="file-code"></i><span data-i18n="reader.dlHtml">Download .html</span></button>
            <button type="button" data-act="copy-html"><i data-icon="copy"></i><span data-i18n="reader.copyHtml">Copy HTML</span></button>
            <button type="button" data-act="print"><i data-icon="printer"></i><span data-i18n="reader.print">Print / PDF</span></button>
            <hr>
            <button type="button" data-act="share"><i data-icon="share"></i><span data-i18n="reader.share">Share as link…</span></button>
            <button type="button" data-act="reader"><i data-icon="book-open"></i><span data-i18n="ed.toReader">Open in reader</span></button>
          </div>
        </div>
      </div>

      <div class="editor-layout" id="edLayout" data-view="split">
        <div class="source-pane">
          <textarea id="src" spellcheck="true" autocomplete="off" autocapitalize="off" data-i18n-placeholder="ed.placeholder" aria-label="Markdown"></textarea>
        </div>
        <div class="preview-pane" id="previewPane">
          <article class="markdown-body" id="preview"></article>
        </div>
      </div>

      <div class="statusbar">
        <span id="stWords"></span>
        <span id="stChars"></span>
        <span id="stLines"></span>
        <span id="stRead"></span>
        <span id="stPos"></span>
        <span class="saved" id="stSaved" data-i18n="ed.saved">Saved locally</span>
        <?= legal_links() ?>
        <?= engineered_by() ?>
      </div>
    </div>
  </div>
  <input type="file" id="fileInput" accept=".md,.markdown,.mdown,.mkd,.mkdn,.mdx,.txt,text/markdown,text/plain" hidden>
<?php app_end();
