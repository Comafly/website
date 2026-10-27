#!/usr/bin/env node
/**
 * Content linter. Fails (exit 1) on problems that would break the site; lists placeholders.
 *   - every JSON file parses
 *   - every media id used exists in media.json
 *   - every nav anchor has a matching section/tab/accordion id on its page
 *   - every "page.xxx#anchor" link points at a real page and anchor
 *   - section ids are unique across the site
 * Run:  npm run validate
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const site = read('content/site.json');
const media = read('content/media.json').items;
const pages = Object.fromEntries(site.pages.map((p) => [p.id, { meta: p, data: read(`content/pages/${p.file}.json`) }]));

const errors = [], notes = [];
const err = (m) => errors.push(m);

function walk(node, path = [], out = []) {
  out.push([node, path]);
  if (Array.isArray(node)) node.forEach((n, i) => walk(n, [...path, i], out));
  else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => walk(v, [...path, k], out));
  return out;
}

// 1. ids per page
const anchorsOf = {};
const sectionIds = new Set();
for (const [pid, { data }] of Object.entries(pages)) {
  const set = new Set();
  for (const [node] of walk(data.sections)) {
    if (node && typeof node === 'object' && !Array.isArray(node) && node.anchor) set.add(node.anchor);
    if (node && typeof node === 'object' && node.id && typeof node.id === 'string' && node.type) {
      if (sectionIds.has(node.id)) err(`Duplicate section id ${node.id}`);
      sectionIds.add(node.id);
      set.add(node.id.replace(/[^\w-]+/g, '-'));
    }
  }
  anchorsOf[pid] = set;
}

// 2. nav anchors
for (const n of site.nav) for (const a of n.anchors) if (!anchorsOf[n.page]?.has(a.anchor)) err(`Nav anchor "${a.anchor}" (${n.page}) has no matching section`);

// 3. media + links + placeholders
const mediaRef = /^m\./;
for (const [pid, { data }] of Object.entries(pages)) {
  for (const [node, path] of walk(data.sections)) {
    if (typeof node !== 'string') continue;
    const key = path[path.length - 1];
    if ((key === 'media' || mediaRef.test(node)) && mediaRef.test(node) && !media[node]) err(`${pid}: unknown media id ${node}`);
    const m = /^(page\.[a-z]+)(?:#(.+))?$/.exec(node);
    if (m && (key === 'to' || key === 'href')) {
      if (!pages[m[1]]) err(`${pid}: link to unknown page ${m[1]}`);
      else if (m[2] && !anchorsOf[m[1]].has(m[2])) err(`${pid}: link ${node} → anchor not found`);
    }
    if ((key === 'href' || key === 'to') && node === '#') notes.push(`${pid}: placeholder link at ${path.join('.')}`);
    for (const l of node.matchAll(/\]\((page\.[a-z]+)(?:#([^)]+))?\)/g)) {
      if (!pages[l[1]]) err(`${pid}: rich link to unknown page ${l[1]}`);
      else if (l[2] && !anchorsOf[l[1]].has(l[2])) err(`${pid}: rich link ${l[1]}#${l[2]} → anchor not found`);
    }
  }
}
for (const n of site.nav) if (n.media && !media[n.media]) err(`nav media ${n.media} missing`);

console.log(`${site.pages.length} pages, ${Object.keys(media).length} media items.`);
if (notes.length) console.log(`\n${notes.length} placeholder links (href "#") still need real destinations:\n  ` + notes.join('\n  '));
if (errors.length) { console.error(`\n${errors.length} problem(s):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('\nContent OK.');
