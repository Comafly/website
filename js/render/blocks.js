import { h, uid } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { content } from '../core/content.js';
import { richInline, paras } from '../core/rich.js';
import { btn, actionRow, photo } from './parts.js';

/**
 * Generic content blocks, composable inside tabs, accordions, features and so on.
 * Add a new block type by adding a function to BLOCKS.
 */
const BLOCKS = {
  text: (b) => paras(b.text).map((html) => h('p', { class: b.class, html })),

  heading: (b) => h(`h${b.level || 3}`, { class: `t-${b.size || (b.level === 4 ? 'h4' : 'h3')} block-heading` }, b.text),

  list: (b) => {
    const ordered = b.ordered;
    return h(ordered ? 'ol' : 'ul', { class: `list list--${b.variant || (ordered ? 'numbered' : 'dash')}` },
      b.items.map((it) => (typeof it === 'string'
        ? h('li', { html: richInline(it) })
        : h('li', {}, h('strong.list__title', {}, it.title), it.text && h('p', { html: richInline(it.text) })))));
  },

  callout: (b) => h('div', { class: `callout callout--${b.tone || 'info'}`, role: 'note' },
    h('span.callout__icon', { aria: { hidden: 'true' } }, icon(b.tone === 'warning' ? 'alert' : 'info')),
    h('div.callout__body', {},
      b.title && h('p.callout__title', {}, b.title),
      paras(b.text).map((html) => h('p', { html })),
      actionRow(b.actions))),

  steps: (b) => h('ol.steps', {}, b.items.map((it, i) => h('li.steps__item', {},
    h('span.steps__num', { aria: { hidden: 'true' } }, String(i + 1).padStart(2, '0')),
    h('div.steps__body', {},
      it.label && h('p.eyebrow', {}, it.label),
      h('h3.t-h3', {}, it.title),
      it.text && paras(it.text).map((html) => h('p', { html })),
      it.list && h('ul.list.list--dash', {}, it.list.map((x) => h('li', { html: richInline(x) }))),
      it.link && btn({ ...it.link, variant: 'link' }))))),

  cards: (b) => h('ul.cardgrid', { role: 'list' }, b.items.map((it) => h('li.mini-card', {},
    it.media && photo(it.media, { sizes: '(min-width: 64em) 30vw, 90vw' }),
    h('div.mini-card__body', {},
      it.eyebrow && h('p.eyebrow', {}, it.eyebrow),
      h('h3.t-h4', {}, it.title),
      it.text && paras(it.text).map((html) => h('p', { html })),
      it.link && btn({ ...it.link, variant: 'link' }))))),

  actions: (b) => actionRow(b.items, b.class),

  facts: (b) => h('dl.facts', {}, b.items.map((it) => h('div.facts__row', {},
    h('dt', {}, it.term),
    h('dd', { html: richInline(it.desc) })))),

  divider: (b) => h('p.divider', { role: 'presentation' }, h('span', {}, b.text || '')),

  downloads: (b) => h('ul.downloads', { role: 'list' }, b.items.map((it) => h('li', {}, btn({
    label: it.label, to: it.to, href: it.href, variant: 'outline', icon: it.icon || 'download', class: 'downloads__btn',
  })))),

  links: (b) => h('div.linklist', {},
    b.title && h('h3.t-h4.linklist__title', {}, b.title),
    h('ul', { role: 'list' }, b.items.map((it) => h('li', {}, btn({ label: it.label, to: it.to, href: it.href, variant: 'link', icon: it.icon || 'doc' }))))),

  rates: (b) => h('div.rates', {},
    b.title && h('h3.t-h4.rates__title', {}, b.title),
    h('dl.rates__grid', {}, b.items.map((it) => h('div.rate', {},
      h('dt.rate__label', {}, it.label),
      h('dd.rate__price', {}, it.price),
      it.unit && h('dd.rate__unit', {}, it.unit),
      it.note && h('dd.rate__note', { html: richInline(it.note) }))))),

  dates: (b) => h('div.dates', {}, b.items.map((it) => {
    const el = h('article.date-card', { data: { kind: it.kind || 'closing', date: it.date } },
      h('p.eyebrow', {}, it.label),
      h('p.date-card__detail', {}, it.detail),
      h('time.date-card__date', { datetime: it.date }, it.display),
      h('p.date-card__status', { data: { dateStatus: true } }));
    decorateDate(el, it);
    return el;
  })),

  group: (b) => h('div.block-group', {},
    b.title && h(`h${b.level || 3}`, { class: 'block-group__title t-h3' }, b.title),
    renderBlocks(b.blocks)),

  media: (b) => h('figure.block-media', {}, photo(b.media, { sizes: '(min-width: 64em) 50vw, 100vw' }), b.caption && h('figcaption.small', {}, b.caption)),

  quote: (b) => h('blockquote.quote', {}, h('p.t-h3', { html: richInline(b.text) }), b.cite && h('cite', {}, b.cite)),
};

/** Annotates date cards with a live "Closed / Opens in N days" status (relative to today). */
function decorateDate(el, it) {
  const status = el.querySelector('[data-date-status]');
  const target = new Date(`${it.date}T00:00:00+08:00`);
  const days = Math.round((target - Date.now()) / 86400000);
  const past = days < 0;
  const kind = it.kind || 'closing';
  const tpl = content.ui(`dates.${kind}.${past ? 'past' : 'future'}`);
  status.textContent = tpl.replace('{n}', Math.abs(days));
  el.classList.add(past ? 'is-past' : 'is-future');
  if (kind === 'closing' && past) el.classList.add('is-closed');
}

export function renderBlocks(blocks = []) {
  const out = document.createDocumentFragment();
  blocks.forEach((b) => {
    const fn = BLOCKS[b.type];
    if (!fn) { console.warn(`Unknown block type "${b.type}"`); return; }
    const node = fn(b);
    [].concat(node).forEach((n) => n && out.append(n));
  });
  return out;
}

export const blockTypes = () => Object.keys(BLOCKS);

/** Lets other modules (accordion, tabs) add block types without circular imports. */
export function registerBlock(name, fn) { BLOCKS[name] = fn; }
