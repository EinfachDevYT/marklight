<?php
/**
 * Marklight – shared page layout (head, header, footer).
 * Engineered by EinfachDev · GPL-3.0-or-later
 */
declare(strict_types=1);

namespace Marklight;

const REPO_URL = 'https://github.com/EinfachDevYT/marklight';

/**
 * @param array{title:string, title_key?:string, description?:string, page:string,
 *              app?:bool, styles?:list<string>, scripts?:list<string>} $p
 */
function page_start(array $p): void
{
    send_page_headers();
    $v = rawurlencode(VERSION);
    $desc = $p['description'] ?? 'Marklight – privacy-friendly Markdown reader, editor and toolbox. Engineered by EinfachDev.';
    $bodyClass = !empty($p['app']) ? 'app' : 'landing';
    $cfg = json_encode(client_config(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);
    ?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($p['title']) ?></title>
  <meta name="description" content="<?= e($desc) ?>">
  <meta name="author" content="EinfachDev">
  <meta name="generator" content="Marklight <?= e(VERSION) ?>">
  <meta name="theme-color" content="#fbfaf7">
  <meta name="referrer" content="no-referrer">
  <meta property="og:title" content="<?= e($p['title']) ?>">
  <meta property="og:description" content="<?= e($desc) ?>">
  <meta property="og:type" content="website">
  <link rel="icon" href="assets/img/logo.svg" type="image/svg+xml">
  <link rel="manifest" href="manifest.webmanifest">
<?php foreach ($p['styles'] ?? [] as $css): ?>
  <link rel="stylesheet" href="<?= e($css) ?>?v=<?= $v ?>">
<?php endforeach; ?>
  <link rel="stylesheet" href="assets/css/app.css?v=<?= $v ?>">
  <script src="assets/js/i18n.js?v=<?= $v ?>"></script>
  <script src="assets/js/icons.js?v=<?= $v ?>"></script>
  <script src="assets/js/core.js?v=<?= $v ?>"></script>
<?php foreach ($p['scripts'] ?? [] as $js): ?>
  <script src="<?= e($js) ?>?v=<?= $v ?>" defer></script>
<?php endforeach; ?>
</head>
<body class="<?= e($bodyClass) ?>" data-title-key="<?= e($p['title_key'] ?? '') ?>" data-config="<?= e($cfg) ?>">
  <a class="sr-only" href="#main">Skip to content</a>
  <header class="site-header">
    <button class="btn btn-ghost btn-icon nav-toggle" id="navToggle" type="button" aria-expanded="false" data-i18n-title="nav.menu"><i data-icon="menu"></i></button>
    <a class="brand" href="./" aria-label="Marklight"><img src="assets/img/logo.svg" alt="" width="30" height="30"><span>Mark<b>light</b></span></a>
    <nav class="main-nav">
<?php foreach (['reader' => 'Reader', 'editor' => 'Editor', 'tools' => 'Tools'] as $slug => $label): ?>
      <a href="<?= $slug ?>.php" data-i18n="nav.<?= $slug ?>"<?= $p['page'] === $slug ? ' aria-current="page"' : '' ?>><?= $label ?></a>
<?php endforeach; ?>
      <a href="./#selfhost" data-i18n="nav.selfhost">Self-hosting</a>
    </nav>
    <div class="header-actions">
      <button class="btn btn-ghost btn-sm" id="langBtn" type="button" data-i18n-title="lang.switch"><i data-icon="languages"></i><span>EN</span></button>
      <button class="btn btn-ghost btn-icon" id="themeBtn" type="button"></button>
      <a class="btn btn-ghost btn-icon" href="<?= REPO_URL ?>" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="GitHub"><i data-icon="github"></i></a>
    </div>
  </header>
<?php
}

function engineered_by(): string
{
    return '<span class="engineered"><span data-i18n="footer.engineered">engineered by</span> <strong>Einfach<em>Dev</em></strong></span>';
}

function page_end(): void
{
    ?>
  <footer class="site-footer">
    <span class="engineered"><span>© <span id="year"><?= date('Y') ?></span> Marklight ·</span> <span data-i18n="footer.engineered">engineered by</span> <strong>Einfach<em>Dev</em></strong></span>
    <nav>
      <a href="reader.php" data-i18n="nav.reader">Reader</a>
      <a href="editor.php" data-i18n="nav.editor">Editor</a>
      <a href="tools.php" data-i18n="nav.tools">Tools</a>
      <a href="<?= REPO_URL ?>" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="<?= REPO_URL ?>/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">GPL-3.0</a>
    </nav>
  </footer>
</body>
</html>
<?php
}
