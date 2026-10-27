import { h, uid } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { content } from '../core/content.js';
import { richInline, plain } from '../core/rich.js';
import { config } from '../config.js';

export const isExternal = (href) => /^https?:\/\//i.test(href) && !href.startsWith(location.origin);

/* ───────────────────────────── Buttons ───────────────────────────── */
/**
 * btn({ label, to|href, variant: solid|outline|ghost|link, icon, size, download })
 * Hover = a fill that expands from the pointer, a rolling label, and a sliding icon (see _btn.scss).
 */
export function btn(o) {
  const target = o.to || o.href;
  const href = target ? content.href(target) : null;
  const external = href ? isExternal(href) : false;
  const iconName = o.icon === false ? null : (o.icon || (o.download ? 'download' : external ? 'external' : 'arrow'));
  return h(href ? 'a' : 'button', {
    class: ['btn', `btn--${o.variant || 'solid'}`, o.size ? `btn--${o.size}` : '', o.class || ''].filter(Boolean).join(' '),
    href,
    type: href ? null : (o.type || 'button'),
    target: external ? '_blank' : null,
    rel: external ? 'noopener noreferrer' : null,
    download: o.download ? '' : null,
    data: { cursor: o.cursor || 'go' },
    onclick: o.onclick,
  },
  h('span.btn__fill', { aria: { hidden: 'true' } }),
  h('span.btn__label', {},
    h('span.btn__text', {}, o.label),
    h('span.btn__text.btn__text--clone', { aria: { hidden: 'true' } }, o.label)),
  iconName && h('span.btn__icon', { aria: { hidden: 'true' } }, icon(iconName)),
  external && h('span.u-visually-hidden', {}, ` ${content.ui('newTab')}`));
}

export const actionRow = (list, cls = '') => (list && list.length
  ? h('div.actions' + (cls ? '.' + cls : ''), {}, list.map((a) => btn(a)))
  : null);

/* ───────────────────────────── Images ───────────────────────────── */
export function srcsetFor(src) {
  if (!/images\.unsplash\.com/.test(src)) return null;
  return config.media.widths.map((w) => `${src.replace(/([?&])w=\d+/, `$1w=${w}`)} ${w}w`).join(', ');
}

/** <img> built from a media.json id: alt text, aspect ratio, focal point and responsive sources included. */
export function img(id, o = {}) {
  const m = content.mediaItem(id);
  const srcset = srcsetFor(m.src);
  return h('img', {
    class: o.class,
    src: m.src,
    srcset,
    sizes: srcset ? (o.sizes || '100vw') : null,
    alt: o.alt ?? m.alt ?? '',
    width: m.w,
    height: m.h,
    decoding: 'async',
    loading: o.eager ? 'eager' : 'lazy',
    fetchpriority: o.eager ? 'high' : null,
    data: { media: id, plxImg: o.parallax === false ? null : true },
    style: { 'object-position': m.focal || '50% 50%' },
  });
}

/** Tinted, overflow-clipped frame around an image (tint shows while loading or if the photo fails). */
export function photo(id, o = {}) {
  const m = content.mediaItem(id);
  return h('div.ph' + (o.class ? '.' + o.class.split(' ').join('.') : ''), { style: { '--tint': m.tint || '#0c2a47' } }, img(id, o));
}

/* ───────────────────────────── Headings ───────────────────────────── */
export function heading(level, text, o = {}) {
  return h(`h${level}`, {
    id: o.id,
    class: o.class,
    lang: o.lang,
    }, ...String(text ?? '').split('\n').flatMap((line, i) => (i ? [h('br'), plain(line)] : [plain(line)])));
}

/**
 * Standard section header: eyebrow, title, lead. Returns { el, titleId }.
 */
export function sectionHead(s, o = {}) {
  const titleId = o.id || (s.anchor ? `${s.anchor}-title` : uid('title'));
  const el = h('header.section-head' + (o.class ? '.' + o.class : ''), {},
    s.eyebrow && h('p.eyebrow', {}, s.eyebrow),
    s.title && heading(o.level || 2, s.title, { id: titleId, class: `section-title ${o.titleClass || 't-h1'}`, lang: s.titleLang }),
    s.lead && h('p.lead', { html: richInline(s.lead) }));
  return { el, titleId };
}

export const eyebrow = (t) => (t ? h('p.eyebrow', {}, t) : null);
