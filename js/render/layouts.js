import { h } from '../core/dom.js';
import { content } from '../core/content.js';
import { icon } from '../core/icons.js';
import { richInline, paras, plain } from '../core/rich.js';
import { photo, sectionHead, actionRow, eyebrow, btn } from './parts.js';
import { renderBlocks } from './blocks.js';
import { shell } from './shell-helpers.js';

/** Big manifesto text whose words light up as you scroll. */
export function statement(s) {
  const { el: head, titleId } = s.title ? sectionHead(s, { titleClass: 't-small statement__title' }) : { el: null, titleId: null };
  const root = shell(s, `statement tone-${s.tone || 'paper'}`, titleId);
  root.append(h('div.container.statement__inner', {},
    !s.title && eyebrow(s.eyebrow),
    head,
    h('p', { class: `statement__text t-${s.size || 'display'}`, data: { wordfill: true }, html: richInline(s.text) }),
    s.caption && h('p.statement__caption.small', { html: richInline(s.caption) }),
    actionRow(s.actions)));
  return root;
}

/** Oversized image beside copy. The image reveals with a clip, then drifts with parallax. */
export function feature(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: s.titleClass || 't-h1' });
  const root = shell(s, ['feature', s.reverse ? 'feature--reverse' : '', s.shape ? `feature--${s.shape}` : '', s.wide ? 'feature--wide' : '', `tone-${s.tone || 'paper'}`].filter(Boolean).join(' '), titleId);
  const media = h('figure.feature__media', { data: { reveal: s.reveal || 'image', cursor: s.cursor || 'view' } },
    photo(s.media, { sizes: '(min-width: 64em) 55vw, 100vw' }),
    s.caption && h('figcaption.feature__caption.small', {}, s.caption));
  const copy = h('div.feature__copy', {},
    head,
    s.body && h('div.prose', {}, paras(s.body).map((html) => h('p', { html }))),
    s.blocks && h('div.prose', {}, renderBlocks(s.blocks)),
    actionRow(s.actions));
  if (s.mark) root.append(h('p.feature__mark', { aria: { hidden: 'true' } }, s.mark));
  root.append(h('div.container.feature__grid', {}, media, copy));
  return root;
}

/** Pinned full-bleed photograph that grows from a rounded, desaturated card to edge-to-edge colour. */
export function banner(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-display' });
  const root = shell(s, 'banner tone-ink', titleId, { data: { banner: true } });
  root.append(h('div.banner__sticky', {},
    h('div.banner__frame', { data: { bannerFrame: true } }, photo(s.media, { sizes: '100vw', class: 'ph--full' }), h('div.banner__tint', { aria: { hidden: 'true' } })),
    h('div.banner__copy.container', { data: { bannerCopy: true } }, head, actionRow(s.actions)),
    // optional article: fades in and rises over the right of the photograph as the scene scrolls on
    s.body && h('div.banner__article', { data: { bannerArticle: true } }, paras(s.body).map((html) => h('p', { html })))));
  if (s.body) root.classList.add('banner--article');
  return root;
}

/** Decorative running text; speed and direction follow scrolling. Hidden from assistive tech. */
export function marquee(s) {
  const unit = () => h('ul.marquee__unit', { role: 'list' }, s.items.map((t) => h('li', {}, h('span', {}, t), h('i', { aria: { hidden: 'true' } }))));
  const root = shell(s, `marquee tone-${s.tone || 'sun'}`, null);
  root.setAttribute('aria-hidden', 'true');
  root.append(h('div.marquee__track', { data: { marquee: s.speed || 1 } }, unit(), unit()));
  return root;
}

/** Animated counters. */
export function stats(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h2' });
  const root = shell(s, `stats tone-${s.tone || 'brand'}`, titleId);
  const fmt = (n, it) => (it.group ? n.toLocaleString('en-AU') : String(n)) + (it.suffix || '');
  root.append(h('div.container', {}, s.title && head,
    h('dl.stats__grid', {}, s.items.map((it) => h('div.stat', { data: { count: it.value, group: it.group ? 'true' : null, suffix: it.suffix || '' } },
      h('dd.stat__value', {}, h('span.u-visually-hidden', {}, fmt(it.value, it)), h('span.stat__num', { aria: { hidden: 'true' } }, '0')),
      h('dt.stat__label', {}, it.label),
      it.caption && h('dd.stat__caption', {}, it.caption))))));
  return root;
}

/** Closing call-to-action band with a spinning stamp. */
export function cta(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-display' });
  const root = shell(s, `cta tone-${s.tone || 'sun'}`, titleId);
  root.append(h('div.container.cta__inner', {}, head, actionRow(s.actions)));
  if (s.stamp) {
    const text = `${s.stamp} · ${s.stamp} · `;
    root.append(h('div.cta__stamp', { aria: { hidden: 'true' } },
      h('svg', { viewBox: '0 0 200 200', width: 200, height: 200, html: `<defs><path id="${s.id.replace(/\W/g, '')}-c" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs><text><textPath href="#${s.id.replace(/\W/g, '')}-c" textLength="480" lengthAdjust="spacing">${plain(text)}</textPath></text>` })));
  }
  return root;
}

/** Full-width alert strip (e.g. closing dates). */
export function notice(s) {
  const root = shell(s, `notice notice--${s.kind || 'info'} tone-${s.tone || 'sun'}`, null);
  root.setAttribute('role', 'note');
  root.append(h('div.container.notice__inner', {},
    h('span.notice__icon', { aria: { hidden: 'true' } }, icon(s.kind === 'warning' ? 'alert' : 'info')),
    h('div', {}, s.title && h('p.notice__title.t-h3', {}, plain(s.title)), s.text && paras(s.text).map((html) => h('p', { html }))),
    actionRow(s.actions)));
  return root;
}

/** Plain prose section: heading + blocks. */
export function prose(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: s.titleClass || 't-h1' });
  const root = shell(s, `prose-section tone-${s.tone || 'paper'}`, titleId);
  root.append(h(s.wide ? 'div.container' : 'div.container.container--narrow', {}, head, s.body && h('div.prose', {}, paras(s.body).map((html) => h('p', { html }))), s.blocks && h('div.prose', {}, renderBlocks(s.blocks)), actionRow(s.actions)));
  return root;
}

/** Vertical list of long, rectangular link buttons (e.g. downloads by year level). */
export function rowlist(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h1' });
  const root = shell(s, `rowlist tone-${s.tone || 'ink'}`, titleId);
  const row = (it) => {
    const a = (it.actions || [])[0] || {};
    const href = a.href || a.to || '#';
    const external = /^https?:\/\//i.test(href);
    return h('li', {}, h('a.rowlist__row', { href: href === '#' ? '#' : (external ? href : content.href(href)), target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null },
      h('span.rowlist__text', {}, it.eyebrow && h('span.rowlist__eyebrow', {}, it.eyebrow), h('span.rowlist__title', {}, plain(it.title))),
      h('span.rowlist__cta', {}, h('span', {}, a.label || ''), icon('download'))));
  };
  root.append(h('div.container', {}, head, h('ul.rowlist__items', { role: 'list', 'aria-label': s.listLabel || null }, s.items.map(row))));
  return root;
}
