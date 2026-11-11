<?php
/** Marklight – Datenschutzerklärung / Privacy policy. Engineered by EinfachDev · GPL-3.0-or-later */
declare(strict_types=1);

namespace Marklight;

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/layout.php';

page_start([
    'title'     => 'Datenschutz · Marklight',
    'title_key' => 'legal.privacy',
    'page'      => 'datenschutz',
]);

$cfg = config();
$l = $cfg['legal'];
$geoOn = ($cfg['geo']['source'] ?? 'none') !== 'none';
$cloudflare = ($cfg['geo']['source'] ?? '') === 'cloudflare';
$fetchOn = !empty($cfg['fetch']['enabled']);
$window = (int) ($cfg['fetch']['rate_limit']['window'] ?? 60);
$hasOwner = ($l['name'] ?? '') !== '';
$date = (string) ($l['privacy_date'] ?? '');
$dateDe = $date !== '' && strtotime($date) ? date('d.m.Y', (int) strtotime($date)) : $date;

$owner = static function () use ($l, $hasOwner): string {
    if (!$hasOwner) {
        return '<p><a href="' . e(imprint_href()) . '">Impressum</a></p>';
    }
    return '<address>' . e($l['name']) . '<br>' . e($l['street']) . '<br>' . e($l['city']) . '<br>' . e($l['country'])
        . ($l['email'] !== '' ? '<br><a href="mailto:' . e($l['email']) . '">' . e($l['email']) . '</a>' : '') . '</address>';
};
?>
  <main id="main" class="legal">
    <div class="legal-inner">
      <p class="kicker mono" data-i18n="legal.kicker">Legal</p>
      <h1 data-i18n="legal.privacy">Privacy</h1>

      <!-- ===================== DEUTSCH ===================== -->
      <section data-lang="de">
        <p class="lead-in"><strong>Kurz gesagt:</strong> Marklight hat keine Benutzerkonten, setzt keine Cookies, nutzt kein Tracking und keine Analyse-Tools und hat keine Datenbank. Deine Dokumente werden ausschließlich in deinem Browser verarbeitet und nie auf unseren Server hochgeladen.</p>

        <h2>1. Verantwortlicher</h2>
        <?= $owner() ?>

        <h2>2. Aufruf der Website</h2>
        <p>Beim Aufruf überträgt dein Browser technisch notwendig Daten an unseren Server (IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Browser-Kennung). Diese Daten werden nur verarbeitet, um die Seite auszuliefern (Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse am sicheren Betrieb).</p>
<?php if (empty($l['access_logs'])): ?>
        <p>Für Marklight werden <strong>keine Zugriffsprotokolle</strong> (Access-Logs) gespeichert. Lediglich bei technischen Fehlern kann der Webserver eine Fehlermeldung mit IP-Adresse protokollieren; diese Protokolle dienen nur der Fehlerbehebung und werden regelmäßig gelöscht.</p>
<?php else: ?>
        <p>Der Webserver speichert diese Daten in Protokolldateien, um Angriffe zu erkennen und Fehler zu beheben. Die Protokolle werden nach kurzer Zeit automatisch gelöscht.</p>
<?php endif; ?>
<?php if (($l['hoster'] ?? '') !== ''): ?>
        <p>Die Website wird gehostet bei: <?= e($l['hoster']) ?>. Mit dem Hoster besteht ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO).</p>
<?php endif; ?>

<?php if ($geoOn): ?>
        <h2>3. Herkunftsland (Sprache)</h2>
        <p>Aus deiner IP-Adresse wird beim Aufruf das Land ermittelt, um die Seite automatisch auf Deutsch oder Englisch anzuzeigen. <?php if ($cloudflare): ?>Das Land wird von unserem Netzwerkdienstleister Cloudflare ermittelt und als Information mitgeschickt.<?php else: ?>Der Abgleich erfolgt lokal auf unserem Server mit einer Datenbank (<?= e($l['geo_db']) ?>); deine IP-Adresse wird dafür an niemanden übermittelt.<?php endif; ?> Das Ergebnis wird nicht gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
<?php endif; ?>

        <h2><?= $geoOn ? '4' : '3' ?>. Speicherung in deinem Browser</h2>
        <p>Damit Marklight wie erwartet funktioniert, speichert die Seite im lokalen Speicher deines Browsers (Local Storage) deine Einstellungen (Design, Sprache, Schrift), den Editor-Entwurf, Eingaben in den Tools sowie die Liste zuletzt geöffneter Dokumente. Außerdem werden die Programmdateien für die Offline-Nutzung zwischengespeichert. Diese Daten verlassen dein Gerät nicht und werden nicht an uns übertragen. Die Speicherung ist für die von dir gewünschte Funktion unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst sie jederzeit über die Browser-Einstellungen („Websitedaten löschen“) entfernen.</p>

        <h2><?= $geoOn ? '5' : '4' ?>. Deine Dokumente</h2>
        <p>Dateien und Ordner, die du öffnest, sowie Texte, die du einfügst oder schreibst, werden nur in deinem Browser verarbeitet. Beim Teilen per Link steckt der Inhalt im Teil der Adresse nach dem „#“; dieser Teil wird von Browsern nicht an Server übertragen.</p>

<?php if ($fetchOn): ?>
        <h2><?= $geoOn ? '6' : '5' ?>. Laden von Dokumenten über eine URL</h2>
        <p>Wenn du die Funktion „Von URL laden“ nutzt, ruft unser Server die angegebene Datei für dich ab und gibt sie an deinen Browser weiter. Der Ziel-Server sieht dabei die IP-Adresse unseres Servers, nicht deine. Adresse und Inhalt werden nicht gespeichert. Zum Schutz vor Missbrauch wird die Anzahl der Anfragen begrenzt; dafür wird ein nicht umkehrbarer, mit einem geheimen Schlüssel gebildeter Hash-Wert deiner IP-Adresse für etwa <?= max(1, (int) ceil($window * 2 / 60)) ?> Minuten in einer temporären Datei gespeichert und danach gelöscht (Art. 6 Abs. 1 lit. f DSGVO).</p>
<?php endif; ?>

        <h2><?= ($geoOn ? 6 : 5) + ($fetchOn ? 1 : 0) ?>. Externe Inhalte in Dokumenten</h2>
        <p>Enthält ein Dokument, das du öffnest, Bilder oder andere Inhalte von fremden Servern, lädt dein Browser diese direkt von dort. Der jeweilige Anbieter erhält dabei deine IP-Adresse. Darauf haben wir keinen Einfluss; es gelten die Datenschutzhinweise des jeweiligen Anbieters. Externe Links (z. B. zu GitHub) werden erst beim Anklicken aufgerufen.</p>

        <h2><?= ($geoOn ? 7 : 6) + ($fetchOn ? 1 : 0) ?>. Deine Rechte</h2>
        <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO). Da wir keine personenbezogenen Daten dauerhaft speichern, können wir in der Regel keine Daten zu deiner Person beauskunften.</p>

        <p class="muted">Stand: <?= e($dateDe) ?></p>
      </section>

      <!-- ===================== ENGLISH ===================== -->
      <section data-lang="en">
        <p class="muted">The legally binding version of this policy is the German one. English translation for convenience.</p>
        <p class="lead-in"><strong>In short:</strong> Marklight has no user accounts, sets no cookies, uses no tracking or analytics and has no database. Your documents are processed exclusively in your browser and are never uploaded to our server.</p>

        <h2>1. Controller</h2>
        <?= $owner() ?>

        <h2>2. Visiting the website</h2>
        <p>When you visit the site, your browser necessarily transmits data to our server (IP address, date and time, requested address, user agent). This data is only processed to deliver the site (Art. 6(1)(f) GDPR – legitimate interest in secure operation).</p>
<?php if (empty($l['access_logs'])): ?>
        <p><strong>No access logs</strong> are stored for Marklight. Only in case of technical errors may the web server log an error message including an IP address; such logs are used solely for troubleshooting and are deleted regularly.</p>
<?php else: ?>
        <p>The web server stores this data in log files to detect attacks and fix errors. The logs are deleted automatically after a short time.</p>
<?php endif; ?>
<?php if (($l['hoster'] ?? '') !== ''): ?>
        <p>Hosting provider: <?= e($l['hoster']) ?> (data processing agreement according to Art. 28 GDPR).</p>
<?php endif; ?>

<?php if ($geoOn): ?>
        <h2>3. Country of origin (language)</h2>
        <p>Your country is derived from your IP address in order to show the site in German or English automatically. <?php if ($cloudflare): ?>The country is determined by our network provider Cloudflare and passed along with the request.<?php else: ?>The lookup happens locally on our server using a database (<?= e($l['geo_db']) ?>); your IP address is not sent to anyone for this.<?php endif; ?> The result is not stored. Legal basis: Art. 6(1)(f) GDPR.</p>
<?php endif; ?>

        <h2><?= $geoOn ? '4' : '3' ?>. Storage in your browser</h2>
        <p>To work as expected, the site stores your settings (theme, language, font), the editor draft, tool inputs and the list of recently opened documents in your browser's local storage, and caches the application files for offline use. This data never leaves your device and is not transmitted to us. It is strictly necessary for the function you requested (§ 25(2) no. 2 TDDDG). You can delete it at any time in your browser settings.</p>

        <h2><?= $geoOn ? '5' : '4' ?>. Your documents</h2>
        <p>Files and folders you open and text you paste or write are processed only in your browser. Share links keep the content in the part of the address after "#", which browsers never send to servers.</p>

<?php if ($fetchOn): ?>
        <h2><?= $geoOn ? '6' : '5' ?>. Loading documents from a URL</h2>
        <p>If you use "Open from URL", our server fetches the file on your behalf and passes it to your browser. The target server sees our server's IP address, not yours. Neither the address nor the content is stored. To prevent abuse, requests are rate-limited; for this, an irreversible keyed hash of your IP address is kept in a temporary file for about <?= max(1, (int) ceil($window * 2 / 60)) ?> minutes and then deleted (Art. 6(1)(f) GDPR).</p>
<?php endif; ?>

        <h2><?= ($geoOn ? 6 : 5) + ($fetchOn ? 1 : 0) ?>. External content in documents</h2>
        <p>If a document you open contains images or other content hosted elsewhere, your browser loads it directly from there and the respective provider receives your IP address. We have no influence on this. External links (e.g. to GitHub) are only contacted when you click them.</p>

        <h2><?= ($geoOn ? 7 : 6) + ($fetchOn ? 1 : 0) ?>. Your rights</h2>
        <p>You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object to processing based on legitimate interests (Art. 21), as well as the right to lodge a complaint with a supervisory authority (Art. 77). As we do not store personal data permanently, we usually hold no data about you.</p>

        <p class="muted">Last updated: <?= e($date) ?></p>
      </section>
    </div>
  </main>
<?php page_end();
