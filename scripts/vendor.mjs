// Copies the browser builds of all third-party libraries from node_modules
// into ./vendor so the site runs fully offline without any CDN.
// Usage: npm install && npm run vendor
import { cpSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'public', 'vendor');

const files = [
  ['marked/lib/marked.umd.js', 'marked/marked.umd.js'],
  ['marked/LICENSE', 'marked/LICENSE'],
  ['dompurify/dist/purify.min.js', 'dompurify/purify.min.js'],
  ['dompurify/LICENSE', 'dompurify/LICENSE'],
  ['@highlightjs/cdn-assets/highlight.min.js', 'highlight/highlight.min.js'],
  ['@highlightjs/cdn-assets/LICENSE', 'highlight/LICENSE'],
  ['katex/dist/katex.min.js', 'katex/katex.min.js'],
  ['katex/dist/katex.min.css', 'katex/katex.min.css'],
  ['katex/LICENSE', 'katex/LICENSE'],
  ['mermaid/dist/mermaid.min.js', 'mermaid/mermaid.min.js'],
  ['mermaid/LICENSE', 'mermaid/LICENSE'],
  ['turndown/lib/turndown.browser.umd.js', 'turndown/turndown.browser.umd.js'],
  ['turndown/LICENSE', 'turndown/LICENSE'],
  ['turndown-plugin-gfm/dist/turndown-plugin-gfm.js', 'turndown/turndown-plugin-gfm.js'],
  ['diff/dist/diff.min.js', 'diff/diff.min.js'],
  ['diff/LICENSE', 'diff/LICENSE'],
];

rmSync(out, { recursive: true, force: true });
for (const [from, to] of files) {
  mkdirSync(dirname(join(out, to)), { recursive: true });
  cpSync(join(nm, from), join(out, to));
}
// KaTeX fonts (woff2 only – supported by every current browser)
mkdirSync(join(out, 'katex/fonts'), { recursive: true });
for (const f of readdirSync(join(nm, 'katex/dist/fonts'))) {
  if (f.endsWith('.woff2')) cpSync(join(nm, 'katex/dist/fonts', f), join(out, 'katex/fonts', f));
}
console.log('vendor/ updated.');
