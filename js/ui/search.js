import { content } from '../core/content.js';
import { $ } from '../core/dom.js';
import { plain } from '../core/rich.js';

/**
 * Site search over the JSON content itself — every page file is walked once, each object with a
 * title becomes a result that links to the nearest anchor. No server needed.
 */
let index = null;
const SKIP_KEYS = new Set(['id', 'type', 'media', 'to', 'href', 'anchor', 'tone', 'variant', 'cardStyle', 'reveal', 'shape', 'kind', 'class', 'date', 'width', 'endpoint', 'action']);

function collect(obj, out = []) {
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach((o) => collect(o, out));
  else if (obj && typeof obj === 'object') Object.entries(obj).forEach(([k, v]) => { if (!SKIP_KEYS.has(k)) collect(v, out); });
  return out;
}

function walk(node, ctx, entries) {
  if (Array.isArray(node)) { node.forEach((n) => walk(n, ctx, entries)); return; }
  if (!node || typeof node !== 'object') return;
  const anchor = node.anchor || ctx.anchor;
  const title = typeof node.title === 'string' ? node.title : typeof node.label === 'string' && node.text ? node.label : null;
  if (title && (node.anchor || node.text || node.body || node.lead || node.blocks || node.items || node.entries)) {
    const text = collect(node).join(' ');
    entries.push({ page: ctx.page, title: plain(title), anchor, text: plain(text).replace(/\s+/g, ' ').slice(0, 1600), key: `${ctx.page.id}|${title}|${anchor}` });
  }
  Object.values(node).forEach((v) => { if (v && typeof v === 'object') walk(v, { ...ctx, anchor }, entries); });
}

async function build() {
  const pages = await content.allPages();
  const entries = [];
  pages.forEach(({ meta, data }) => walk(data.sections, { page: meta, anchor: null }, entries));
  const seen = new Set();
  return entries.filter((e) => (seen.has(e.key) ? false : seen.add(e.key)));
}

function score(entry, terms) {
  const t = entry.title.toLowerCase(), x = entry.text.toLowerCase();
  let s = 0;
  for (const term of terms) {
    const inT = t.includes(term), inX = x.includes(term);
    if (!inT && !inX) return 0;
    s += (inT ? 12 : 0) + (inX ? 2 : 0);
  }
  return s + (entry.anchor ? 1 : 0);
}

function snippet(entry, terms) {
  const x = entry.text; const low = x.toLowerCase();
  const at = terms.map((t) => low.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - 50);
  return (start ? '… ' : '') + x.slice(start, start + 150) + (x.length > start + 150 ? ' …' : '');
}

export function initSearch() {
  const dialog = $('[data-dialog="search"]');
  const input = $('[data-search-input]', dialog);
  const results = $('[data-search-results]', dialog);
  const status = $('[data-search-status]', dialog);
  const d = content.site.dialogs.search;
  let t = 0;

  dialog.addEventListener('dialog:open', async () => {
    if (!index) { status.textContent = d.loading; index = await build(); status.textContent = d.hint; }
  });
  dialog.addEventListener('close', () => { input.value = ''; results.replaceChildren(); status.textContent = d.hint; });

  const run = () => {
    if (!index) return;
    const terms = input.value.toLowerCase().split(/\s+/).filter((x) => x.length > 1);
    results.replaceChildren();
    if (!terms.length) { status.textContent = d.hint; return; }
    const hits = index.map((e) => ({ e, s: score(e, terms) })).filter((h) => h.s).sort((a, b) => b.s - a.s).slice(0, 12);
    status.textContent = hits.length ? d.count.replace('{n}', hits.length) : d.none.replace('{q}', input.value);
    hits.forEach(({ e }) => {
      const a = document.createElement('a');
      a.className = 'search__hit';
      a.href = `${e.page.href}${e.anchor ? `#${e.anchor}` : ''}`;
      const l = document.createElement('span'); l.className = 'eyebrow'; l.textContent = e.page.label;
      const ti = document.createElement('span'); ti.className = 'search__title t-h3'; ti.textContent = e.title;
      const sn = document.createElement('span'); sn.className = 'search__snippet small'; sn.textContent = snippet(e, terms);
      a.append(l, ti, sn);
      const li = document.createElement('li'); li.append(a); results.append(li);
    });
  };
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
  results.addEventListener('click', (e) => { if (e.target.closest('a')) dialog.close(); });
}
