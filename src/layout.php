<?php
/**
 * Marklight – shared page layout (head, header, footer).
 * Engineered by EinfachDev · GPL-3.0-or-later
 */
declare(strict_types=1);

namespace Marklight;

const REPO_URL = 'https://github.com/EinfachDevYT/marklight';
const AUTHOR_URL = 'https://einfachdev.de';

/** Clean, extension-less page URLs (the web server maps them to *.php). */
function page_url(string $page): string
{
    return $page === 'home' ? './' : $page;
}

/**
 * @param array{title:string, title_key?:string, description?:string, page:string,
 *              app?:bool, styles?:list<string>, scripts?:list<string>} $p
 */
function page_start(array $p): void
{
    canonical_redirect($p['page'] === 'home' ? 'index' : $p['page']);
    send_page_headers();
    header('Vary: Accept-Language');
    $v = rawurlencode(VERSION);
    $lang = ui_lang();
    $desc = $p['description'] ?? 'Marklight – privacy-friendly Markdown reader, editor and toolbox. Engineered by EinfachDev.';
    $bodyClass = !empty($p['app']) ? 'app' : 'landing';
    $cfg = json_encode(client_config(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);
    ?>
<!doctype html>
<html lang="<?= e($lang) ?>" data-default-lang="<?= e($lang) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($p['title']) ?></title>
  <meta name="description" content="<?= e($desc) ?>">
  <meta name="author" content="EinfachDev · einfachdev.de">
  <meta name="generator" content="Marklight <?= e(VERSION) ?>">
  <meta name="theme-color" content="#0D0B14">
  <meta name="referrer" content="no-referrer">
  <meta name="view-transition" content="same-origin">
  <meta property="og:title" content="<?= e($p['title']) ?>">
  <meta property="og:description" content="<?= e($desc) ?>">
  <meta property="og:type" content="website">
  <link rel="icon" href="assets/img/logo.svg" type="image/svg+xml">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="author" href="<?= AUTHOR_URL ?>">
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
  <script type="speculationrules">{"prefetch":[{"where":{"href_matches":["/","/reader","/editor","/tools","/impressum","/datenschutz"]},"eagerness":"moderate"}]}</script>
</head>
<body class="<?= e($bodyClass) ?>" data-page="<?= e($p['page']) ?>" data-title-key="<?= e($p['title_key'] ?? '') ?>" data-config="<?= e($cfg) ?>">
  <a class="sr-only" href="#main">Skip to content</a>
  <header class="site-header">
    <button class="btn btn-ghost btn-icon nav-toggle" id="navToggle" type="button" aria-expanded="false" data-i18n-title="nav.menu"><i data-icon="menu"></i></button>
    <a class="brand" href="./" aria-label="Marklight"><img src="assets/img/logo.svg" alt="" width="30" height="30"><span>Mark<b>light</b></span></a>
    <nav class="main-nav">
<?php foreach (['reader' => 'Reader', 'editor' => 'Editor', 'tools' => 'Tools'] as $slug => $label): ?>
      <a href="<?= page_url($slug) ?>" data-i18n="nav.<?= $slug ?>"<?= $p['page'] === $slug ? ' aria-current="page"' : '' ?>><?= $label ?></a>
<?php endforeach; ?>
      <a href="./#selfhost" data-i18n="nav.selfhost">Self-hosting</a>
    </nav>
    <div class="header-actions">
      <button class="btn btn-ghost btn-sm" id="langBtn" type="button" data-i18n-title="lang.switch"><i data-icon="languages"></i><span><?= e(strtoupper($lang)) ?></span></button>
      <button class="btn btn-ghost btn-icon" id="themeBtn" type="button"></button>
      <a class="btn btn-ghost btn-icon" href="<?= REPO_URL ?>" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="GitHub"><i data-icon="github"></i></a>
    </div>
  </header>
<?php
}

/** "Engineered by EinfachDev" signature linking to einfachdev.de. */
function engineered_by(): string
{
    return '<a class="engineered" href="' . AUTHOR_URL . '" target="_blank" rel="noopener author">'
        . '<span data-i18n="footer.engineered">engineered by</span> <strong>Einfach<em>Dev</em></strong></a>';
}

/** Links to the legal pages – must be reachable from every page. */
function legal_links(): string
{
    return '<span class="legal-links"><a href="' . e(imprint_href()) . '" data-i18n="legal.imprint">Imprint</a>'
        . '<a href="datenschutz" data-i18n="legal.privacy">Privacy</a></span>';
}

function imprint_href(): string
{
    $legal = config()['legal'];
    return ($legal['name'] ?? '') === '' && ($legal['imprint_url'] ?? '') !== '' ? (string) $legal['imprint_url'] : 'impressum';
}

/** Runs translations/icons before first paint (no inline JS needed). */
function boot_script(): string
{
    return '<script src="assets/js/boot.js?v=' . rawurlencode(VERSION) . '"></script>';
}

/** Closing markup for the full-screen app pages (reader, editor, tools). */
function app_end(): void
{
    echo '  ' . boot_script() . "\n</body>\n</html>\n";
}

function page_end(): void
{
    ?>
  <footer class="site-footer">
    <div class="footer-inner">
      <a class="brand" href="./" aria-label="Marklight"><img src="assets/img/logo.svg" alt="" width="30" height="30"><span>Mark<b>light</b></span></a>
      <p class="mono muted" data-i18n="footer.tagline">Markdown, beautifully read.</p>
      <nav class="footer-links">
        <a href="<?= page_url('reader') ?>" data-i18n="nav.reader">Reader</a>
        <a href="<?= page_url('editor') ?>" data-i18n="nav.editor">Editor</a>
        <a href="<?= page_url('tools') ?>" data-i18n="nav.tools">Tools</a>
        <a href="<?= REPO_URL ?>" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="<?= e(imprint_href()) ?>" data-i18n="legal.imprint">Imprint</a>
        <a href="datenschutz" data-i18n="legal.privacy">Privacy</a>
      </nav>
    </div>
    <div class="footer-bar">
      <span class="mono muted">© <span id="year"><?= date('Y') ?></span> Marklight · GPL-3.0</span>
      <?= engineered_by() ?>
    </div>
  </footer>
  <?= boot_script() ?>
</body>
</html>
<?php
}
