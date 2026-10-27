import { h, uid } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { content } from '../core/content.js';
import { richInline, plain } from '../core/rich.js';
import { btn, photo, heading, eyebrow, actionRow } from './parts.js';
import { shell, sectionId } from './shell-helpers.js';

/* ───────── Home hero: a pinned, scroll-controlled sequence of full-bleed frames ───────── */
export function heroSequence(s) {
  const frames = s.frames;
  const root = shell(s, 'seq seq--hero tone-ink', null, { data: { hero: true, frames: frames.length } });
  root.style.setProperty('--frames', frames.length);
  root.setAttribute('aria-label', s.label || plain(frames[0].title));
  root.setAttribute('role', 'region');

  const media = h('div.seq__media', {}, frames.map((f, i) => h('figure.seq__frame', { data: { i } },
    h('div.seq__frame-in', {}, photo(f.media, { eager: true, sizes: '100vw', class: 'ph--full', parallax: false })))));
  const edge = h('div.seq__edge', { aria: { hidden: 'true' } });

  const slides = h('div.seq__copy.container', {}, frames.map((f, i) => h('div.seq__slide', { data: { i } },
    f.eyebrow && h('p.eyebrow', {}, f.eyebrow),
    h(i === 0 ? 'h1' : 'h2', { class: 'seq__title t-mega', lang: f.titleLang }, plain(f.title)),
    f.body && h('p.seq__body.lead', { html: richInline(f.body) }),
    f.action && btn({ ...f.action, variant: f.action.variant || 'solid' }))));

  // pills (one per slide) joined by hairline timelines: the line after the current pill fills as that slide plays,
  // and when it reaches the next pill the next slide loads
  const pills = h('nav.hero-pills', { 'aria-label': content.ui('hero.slides') },
    frames.map((f, i) => h('div.hero-pills__item', { data: { pillItem: i } },
      h('button.hero-pills__pill', { type: 'button', data: { pill: i }, 'aria-label': `${content.ui('hero.show')} ${plain(f.pill || f.title)}` },
        h('span.hero-pills__num', { aria: { hidden: 'true' } }, String(i + 1).padStart(2, '0')),
        h('span.hero-pills__label', {}, plain(f.pill || f.title))),
      h('span', { class: `hero-pills__line${i === frames.length - 1 ? ' is-loop' : ''}`, aria: { hidden: 'true' } }, h('i', { data: { fill: i } })))),
    h('button.hero-pills__toggle', { type: 'button', data: { heroToggle: true }, 'aria-pressed': 'false', 'aria-label': content.ui('hero.pause') }, h('i', { aria: { hidden: 'true' } })));

  const hud = h('div.seq__hud.container', {}, pills,
    h('a.scroll-cue', { href: '#', data: { next: true, cursor: 'scroll' } },
      h('span.scroll-cue__label', {}, content.ui('scroll')), icon('arrowDown', 'icon scroll-cue__icon')));

  root.append(h('div.seq__sticky', {}, media, edge, h('div.seq__shade', { aria: { hidden: 'true' } }), slides, hud));
  return root;
}

/* ───────── Inner-page hero: oversized photo, giant title, anchor chips ───────── */
export function pageHero(s) {
  const titleId = `${sectionId(s)}-title`;
  const root = shell(s, 'phero tone-ink', titleId, { data: { phero: true } });

  let chipNav = null;
  const groups = s.chipGroups;
  const navEntry = content.site.nav.find((n) => n.page === content.pageMeta.id);
  const chips = s.chips === 'nav' ? (navEntry?.anchors || []) : s.chips;
  const chipEl = (c) => h('a.chip', { href: content.href(c.to || `#${c.anchor}`), data: { cursor: 'go' } }, c.label);
  if (groups) {
    chipNav = h('nav.phero__chips', { 'aria-label': content.ui('onThisPage') },
      groups.map((g) => h('div.chip-group', {}, h('p.chip-group__label', {}, g.label), h('ul', { role: 'list' }, g.links.map((c) => h('li', {}, chipEl(c)))))));
  } else if (chips?.length) {
    chipNav = h('nav.phero__chips', { 'aria-label': content.ui('onThisPage') }, h('ul', { role: 'list' }, chips.map((c) => h('li', {}, chipEl(c)))));
  }

  root.append(
    h('div.phero__media', { data: { pheroMedia: true } }, photo(s.media, { eager: true, sizes: '100vw', class: 'ph--full' }), h('div.phero__shade', { aria: { hidden: 'true' } })),
    h('div.phero__inner.container', {},
      eyebrow(s.eyebrow),
      h('h1', { id: titleId, class: 'phero__title t-mega', lang: s.titleLang }, plain(s.title)),
      s.lead && h('p.phero__lead.lead', { html: richInline(s.lead) }),
      chipNav),
    h('a.scroll-cue', { href: '#', data: { next: true, cursor: 'scroll' } },
      h('span.scroll-cue__label', {}, content.ui('scroll')), icon('arrowDown', 'icon scroll-cue__icon')));
  return root;
}
