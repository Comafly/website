#!/usr/bin/env node
/**
 * Generates the thin HTML shells (one per page in content/site.json).
 * Every shell is identical except <body data-page="…"> and the <title>/description fallback;
 * the visible page is built from JSON by js/main.js.
 *
 * Run:  npm run pages
 * The Google Fonts <link> is read from scss/abstracts/_tokens.scss ($font-import-url) so fonts
 * are defined in exactly one place.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(resolve(root, 'content/site.json'), 'utf8'));
const tokens = readFileSync(resolve(root, 'scss/abstracts/_tokens.scss'), 'utf8');
const fontUrl = (tokens.match(/\$font-import-url:\s*"([^"]+)"/) || [])[1];
if (!fontUrl) throw new Error('Could not find $font-import-url in _tokens.scss');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const strips = [1, 2, 3, 4, 5].map((n) => `<i style="--i:${n}"></i>`).join('');

for (const page of site.pages) {
  const data = JSON.parse(readFileSync(resolve(root, `content/pages/${page.file}.json`), 'utf8'));
  const title = `${data.meta.title} · ${site.brand.name}`;
  const html = `<!doctype html>
<html lang="${site.lang || 'en-AU'}" data-motion="full">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(data.meta.description || '')}">
  <meta name="theme-color" content="#06192b">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://images.unsplash.com" crossorigin>
  <link rel="stylesheet" href="${fontUrl.replace(/&/g, '&amp;')}">
  <link rel="stylesheet" href="css/main.css">
  <link rel="modulepreload" href="js/main.js">
  <script>
    // Apply the saved motion preference before first paint (prevents a flash of animation).
    try { var m = localStorage.getItem('side.motion'); if (m === 'reduced' || (!m && matchMedia('(prefers-reduced-motion: reduce)').matches)) document.documentElement.dataset.motion = 'reduced'; } catch (e) {}
  </script>
  <script type="module" src="js/main.js"></script>
  <noscript><style>.curtain{display:none}body.is-loading main{visibility:visible}</style></noscript>
</head>
<body data-page="${page.id}" class="is-loading">
  <div class="curtain" aria-hidden="true">${strips}</div>
  <header id="site-header" class="site-header"></header>
  <main id="main"><noscript><p style="padding:8rem 2rem">This site needs JavaScript to display its content. Please enable it, or contact the school on (08) 9311 4000.</p></noscript></main>
  <footer id="site-footer" class="site-footer tone-ink"></footer>
</body>
</html>
`;
  writeFileSync(resolve(root, page.href), html);
  console.log('wrote', page.href);
}
