import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { plain } from '../core/rich.js';
import { photo, sectionHead, btn } from './parts.js';
import { shell } from './shell-helpers.js';

/**
 * inSIDE newsletter. A pinned stage of full-section "sheets": as the reader scrolls, the top sheet turns like a
 * page (hinged on its left edge, fx/book.js) and reveals the next one underneath.
 *   sheet 1  the current issue: its cover fills the left half, the details and actions sit on the right
 *   sheet 2  "In this issue": the story pages
 *   sheet 3  previous issues
 * Everything is real, linkable text. Without pinning (narrow screens / reduced motion) the sheets simply stack.
 */
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

export function newsletter(s) {
  const [latest, ...older] = s.items;
  const lab = s.labels || {};
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h2' });
  const pages = latest.pages || [];
  const act = (a, i) => btn({ ...a, variant: i === 0 ? 'solid' : 'outline', icon: a.download === false ? 'download' : a.icon });

  // ── sheet 1: cover + current issue ──
  const sheet1 = h('div.sheet.sheet--cover', { data: { sheet: 0 } },
    h('div.sheet__cover', {}, photo(latest.media, { sizes: '(min-width: 64em) 50vw, 100vw', parallax: false, eager: true })),
    h('div.sheet__body', {}, head,
      h('article.news__latest', { aria: { labelledby: `${titleId}-latest` } },
        h('p.news__badge', {}, lab.latest || 'Latest issue'),
        h('h3.news__issue', { id: `${titleId}-latest` }, plain(latest.eyebrow)),
        latest.body && h('p.news__lead', {}, latest.body),
        h('div.actions', {}, (latest.actions || []).map(act))),
      pages.length ? h('p.news__turn', { aria: { hidden: 'true' } }, lab.turn || 'Scroll to turn the page', icon('arrowRight')) : null));

  // ── sheet 2: the story pages ──
  const sheet2 = pages.length ? h('div.sheet.sheet--stories', { data: { sheet: 1 } },
    h('div.container.sheet__inner', {},
      h('header.sheet__head', {},
        h('p.eyebrow', {}, latest.eyebrow),
        h('h3.sheet__title', {}, lab.inThisIssue || 'In this issue')),
      h('ol.nl-stories', { role: 'list' }, pages.map((p, i) => h('li', { class: `nl-story nl-story--tone${i % 4}`, style: { '--i': i } },
        h('span.nl-story__num', { aria: { hidden: 'true' } }, String(p.page)),
        h('p.nl-story__kicker', {}, p.kicker || ''),
        h('h4.nl-story__title', {}, plain(p.title)),
        p.text && h('p.nl-story__text', {}, p.text),
        h('p.nl-story__page', {}, fill(lab.page || 'Page {n}', { n: p.page }))))))) : null;

  // ── sheet 3: previous issues ──
  const sheet3 = older.length ? h('div.sheet.sheet--previous', { data: { sheet: 2 } },
    h('div.container.sheet__inner.sheet__inner--split', {},
      h('header.sheet__head', {}, h('h3.sheet__title', { id: `${titleId}-prev` }, lab.previous || 'Previous issues')),
      h('ul.news__list', { role: 'list', aria: { labelledby: `${titleId}-prev` } }, older.map((it, i) => h('li.news__row', { style: { '--i': i } },
        h('p.news__row-title', {}, h('span.news__row-year', {}, it.eyebrow), plain(it.title)),
        h('div.news__row-actions', {}, (it.actions || []).map((a) => btn({ ...a, variant: 'link', icon: a.download === false ? 'download' : (a.icon ?? 'arrow'), class: 'news__link' }))))))) ) : null;

  const sheets = [sheet1, sheet2, sheet3].filter(Boolean);
  const flips = sheets.length - 1;
  const root = shell(s, `news tone-${s.tone || 'brand'}`, titleId, { data: { sheets: true, flips } });
  root.style.setProperty('--flips', flips);
  root.append(h('div.news__track', {}, h('div.news__sticky', {}, sheets)));
  return root;
}
