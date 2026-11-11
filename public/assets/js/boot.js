/* Marklight – runs at the end of <body>, before first paint: translate and draw icons
   so pages never flash untranslated text. Engineered by EinfachDev. */
(function () {
  'use strict';
  var ML = window.Marklight;
  if (!ML) return;
  ML.hydrateIcons();
  ML.applyI18n();
  if (ML.updateHeader) ML.updateHeader();
})();
