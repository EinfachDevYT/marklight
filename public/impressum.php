<?php
/** Marklight – Impressum / Legal notice (§ 5 DDG). Engineered by EinfachDev · GPL-3.0-or-later */
declare(strict_types=1);

namespace Marklight;

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/layout.php';

$l = config()['legal'];

// No own data configured but an external Impressum is set → send visitors there.
if (($l['name'] ?? '') === '' && ($l['imprint_url'] ?? '') !== '' && preg_match('#^https://#i', (string) $l['imprint_url'])) {
    header('Location: ' . $l['imprint_url'], true, 302);
    exit;
}

page_start([
    'title'     => 'Impressum · Marklight',
    'title_key' => 'legal.imprint',
    'page'      => 'impressum',
]);
$configured = ($l['name'] ?? '') !== '';
?>
  <main id="main" class="legal">
    <div class="legal-inner">
      <p class="kicker mono" data-i18n="legal.kicker">Legal</p>
      <h1 data-i18n="legal.imprint">Imprint</h1>

<?php if (!$configured): ?>
      <div class="notice">
        <strong>Not configured yet.</strong> Operators: fill in <code>legal</code> in <code>config/config.local.php</code>.
      </div>
<?php endif; ?>

      <section data-lang="de">
        <h2>Angaben gemäß § 5 DDG</h2>
        <address>
          <?= e($l['name']) ?><br>
          <?= e($l['street']) ?><br>
          <?= e($l['city']) ?><br>
          <?= e($l['country']) ?>
        </address>

        <h2>Kontakt</h2>
        <p>
          E-Mail: <?= ($l['email'] ?? '') !== '' ? '<a href="mailto:' . e($l['email']) . '">' . e($l['email']) . '</a>' : '–' ?>
<?php if (($l['phone'] ?? '') !== ''): ?>
          <br>Telefon: <?= e($l['phone']) ?>
<?php endif; ?>
        </p>
<?php if (($l['vat_id'] ?? '') !== ''): ?>
        <h2>Umsatzsteuer-ID</h2>
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <?= e($l['vat_id']) ?></p>
<?php endif; ?>

        <h2>Haftung für Inhalte</h2>
        <p>Marklight ist ein Werkzeug, das Dokumente ausschließlich im Browser der Nutzer:innen anzeigt und bearbeitet. Inhalte, die Nutzer:innen selbst öffnen, einfügen oder über Links teilen, stammen nicht vom Betreiber und werden nicht auf dem Server gespeichert; für diese Inhalte ist der Betreiber nicht verantwortlich. Werden uns Rechtsverletzungen bekannt, entfernen wir betroffene Inhalte, soweit sie von uns stammen, umgehend.</p>

        <h2>Haftung für Links</h2>
        <p>Dieses Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links umgehend.</p>

        <h2>Quellcode &amp; Lizenz</h2>
        <p>Marklight ist freie Software unter der <a href="<?= REPO_URL ?>/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">GNU GPL-3.0</a>. Quellcode: <a href="<?= REPO_URL ?>" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
      </section>

      <section data-lang="en">
        <p class="muted">The legally binding version of this notice is the German one. English translation for convenience.</p>
        <h2>Information according to § 5 DDG (German Digital Services Act)</h2>
        <address>
          <?= e($l['name']) ?><br>
          <?= e($l['street']) ?><br>
          <?= e($l['city']) ?><br>
          <?= e($l['country']) ?>
        </address>

        <h2>Contact</h2>
        <p>
          E-mail: <?= ($l['email'] ?? '') !== '' ? '<a href="mailto:' . e($l['email']) . '">' . e($l['email']) . '</a>' : '–' ?>
<?php if (($l['phone'] ?? '') !== ''): ?>
          <br>Phone: <?= e($l['phone']) ?>
<?php endif; ?>
        </p>
<?php if (($l['vat_id'] ?? '') !== ''): ?>
        <h2>VAT ID</h2>
        <p>VAT identification number according to § 27a UStG: <?= e($l['vat_id']) ?></p>
<?php endif; ?>

        <h2>Liability for content</h2>
        <p>Marklight is a tool that displays and edits documents exclusively in the user's browser. Content that users open, paste or share via links themselves does not originate from the operator and is not stored on the server; the operator is not responsible for it.</p>

        <h2>Liability for links</h2>
        <p>This service contains links to external third-party websites whose content we cannot influence. The respective provider is always responsible for the content of linked pages.</p>

        <h2>Source code &amp; license</h2>
        <p>Marklight is free software under the <a href="<?= REPO_URL ?>/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">GNU GPL-3.0</a>. Source: <a href="<?= REPO_URL ?>" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
      </section>
    </div>
  </main>
<?php page_end();
