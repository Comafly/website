import { h, uid } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { content } from '../core/content.js';
import { richInline, paras, plain } from '../core/rich.js';
import { btn, photo, sectionHead, actionRow, eyebrow } from './parts.js';
import { renderBlocks, registerBlock } from './blocks.js';
import { shell, sectionId } from './shell-helpers.js';
import { storyDialog } from './stories.js';

/* ═════════════════ Accordion (native <details>: keyboard, AT and find-in-page for free) ═════════════════ */
export function accordionEl(items, o = {}) {
  const group = uid('acc');
  const details = items.map((it) => h('details', { class: 'acc', id: it.anchor || null, name: o.exclusive ? group : null },
    h('summary.acc__summary', { data: { cursor: 'toggle' } },
      h('span.acc__title', {}, it.title),
      h('span.acc__icon', { aria: { hidden: 'true' } }, icon('plus'))),
    h('div.acc__panel', {}, h('div.acc__inner', {},
      it.body && paras(it.body).map((html) => h('p', { html })),
      it.blocks && renderBlocks(it.blocks),
      actionRow(it.actions)))));
  const controls = o.expandAll === false ? null : h('div.acc-controls', {},
    h('button.link-btn', { type: 'button', data: { accAll: 'open' } }, content.ui('accordion.expandAll')),
    h('span', { aria: { hidden: 'true' } }, '/'),
    h('button.link-btn', { type: 'button', data: { accAll: 'close' } }, content.ui('accordion.collapseAll')));
  return h('div.acc-group', { data: { accGroup: true } }, items.length > 2 ? controls : null, details);
}
registerBlock('accordion', (b) => accordionEl(b.items, b));

export function accordion(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h1' });
  const root = shell(s, `section-acc tone-${s.tone || 'paper'}`, titleId);
  root.append(h('div.container.container--narrow', {}, head, accordionEl(s.items, s), s.blocks && renderBlocks(s.blocks)));
  return root;
}

/* ═════════════════ Tabs (ARIA tabs, deep-linkable by panel id) ═════════════════ */
export function tabsEl(tabs, o = {}) {
  const group = uid('tabs');
  const list = h('div.tabs__list', { role: 'tablist', 'aria-orientation': o.variant === 'side' ? 'vertical' : null, 'aria-label': o.label || null, data: { cursor: 'tab' } },
    tabs.map((t, i) => h('button', {
      class: 'tabs__tab', type: 'button', role: 'tab', id: `${group}-tab-${i}`, 'aria-controls': t.anchor || `${group}-panel-${i}`,
      'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', data: { panel: t.anchor || `${group}-panel-${i}` },
    }, h('span.tabs__label', {}, t.label), t.eyebrow && h('span.tabs__sub', {}, t.eyebrow))));
  const panels = tabs.map((t, i) => h('div', {
    class: 'tabs__panel', role: 'tabpanel', id: t.anchor || `${group}-panel-${i}`, 'aria-labelledby': `${group}-tab-${i}`,
    tabindex: '0', hidden: i === 0 ? null : 'until-found',
  },
    (t.title || t.lead) && h('header.tabs__head', {},
      t.title && h('h3', { class: 't-h2 tabs__title' }, plain(t.title)),
      t.lead && h('p.lead', { html: richInline(t.lead) })),
    t.body && h('div.prose', {}, paras(t.body).map((html) => h('p', { html }))),
    t.blocks && h('div.prose', {}, renderBlocks(t.blocks))));
  return h('div', { class: `tabs ${o.variant ? `tabs--${o.variant}` : ''}`, data: { tabs: true } }, list, h('div.tabs__panels', {}, panels));
}
registerBlock('tabs', (b) => tabsEl(b.tabs, b));

export function tabs(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h1' });
  const root = shell(s, `section-tabs tone-${s.tone || 'paper'}`, titleId);
  root.append(h('div.container', {}, head, s.blocks && h('div.prose.prose--intro', {}, renderBlocks(s.blocks)), tabsEl(s.tabs, { label: s.tabsLabel || s.title, variant: s.variant }),
    s.after && h('div.prose', {}, renderBlocks(s.after))));
  return root;
}

/* ═════════════════ Horizontal-scroll collections ═════════════════ */
function cardBody(it, style) {
  const level = 3;
  const titleEl = it.to || it.href
    ? h(`h${level}`, { class: 'card__title' }, h('a.card__link', { href: content.href(it.to || it.href), target: /^https?:/.test(it.href || '') ? '_blank' : null, rel: /^https?:/.test(it.href || '') ? 'noopener noreferrer' : null }, plain(it.title)))
    : h(`h${level}`, { class: 'card__title' }, plain(it.title));
  return h('div.card__body', {},
    it.eyebrow && h('p.eyebrow', {}, it.eyebrow),
    titleEl,
    it.meta && h('p.card__meta.small', {}, it.meta),
    it.body && paras(it.body).map((html) => h('p.card__text', { html })),
    it.list && h('ul.list.list--dash', {}, it.list.map((x) => h('li', { html: richInline(x) }))),
    it.actions && actionRow(it.actions, 'actions--tight'));
}

function card(it, style, i, total, base) {
  const n = String(i + 1).padStart(2, '0');
  switch (style) {
    case 'era':
      return h('article', { class: 'card card--era', id: it.anchor || null },
        h('p.card__era', { aria: { hidden: 'true' } }, it.label),
        h('h3.u-visually-hidden', {}, it.label),
        h('ol.era-list', {}, it.entries.map((e) => h('li.era-list__item', {},
          h('h4.t-h4', {}, e.title),
          h('p', {}, e.text),
          e.media && photo(e.media, { sizes: '30vw' })))));
    case 'panel':
      return h('article', { class: 'card card--panel', id: it.anchor || null },
        h('p.card__num', { aria: { hidden: 'true' } }, n),
        cardBody(it, style));
    case 'person':
      return h('article', { class: `card card--person${it.article ? ' card--story' : ''}`, id: it.anchor || null, data: { cursor: 'read' } },
        it.media && h('figure.card__media', {}, photo(it.media, { sizes: '(min-width: 64em) 28vw, 80vw' })),
        cardBody(it, style),
        it.article && h('button.card__open', { type: 'button', 'aria-haspopup': 'dialog', data: { open: `${base}-story-${i}` } },
          h('span.u-visually-hidden', {}, `Read story: ${plain(it.title)}`)));
    case 'cover':
      return h('article', { class: 'card card--cover', id: it.anchor || null },
        it.media && h('figure.card__media', {}, photo(it.media, { sizes: '(min-width: 64em) 24vw, 70vw' })),
        cardBody(it, style));
    default: // poster
      return h('article', { class: 'card card--poster', id: it.anchor || null, data: { cursor: it.to || it.href ? 'open' : 'drag' } },
        it.media && h('figure.card__media', {}, photo(it.media, { sizes: '(min-width: 64em) 36vw, 80vw' })),
        h('p.card__num', { aria: { hidden: 'true' } }, `${n}`),
        cardBody(it, style));
  }
}

export function hscroll(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h1' });
  const root = shell(s, `hs tone-${s.tone || 'ink'} hs--${s.cardStyle || 'poster'}`, titleId, { data: { hs: true } });
  const items = s.items.map((it, i) => h('li', { class: 'hs__item', data: { hsItem: i } }, card(it, s.cardStyle || 'poster', i, s.items.length, sectionId(s))));
  const track = h('div.hs__track', { data: { hsTrack: true } },
    h('div.hs__intro', {}, head, actionRow(s.actions), s.hint !== false && h('p.hs__hint', { aria: { hidden: 'true' } }, icon('arrow'), h('span', {}, content.ui('hscrollHint')))),
    h('ul.hs__list', { role: 'list', 'aria-label': plain(s.listLabel || s.title) }, items),
    s.outro && h('div.hs__outro', {}, s.outro.title && h('p.t-h2', {}, s.outro.title), s.outro.text && h('p', { html: richInline(s.outro.text) }), actionRow(s.outro.actions)));
  const dialogs = s.items.map((it, i) => (it.article ? storyDialog(it, `${sectionId(s)}-story-${i}`) : null)).filter(Boolean);
  root.append(...dialogs, h('div.hs__pin', {}, track,
    h('div.hs__hud.container', { aria: { hidden: 'true' } },
      h('span.hs__bar', {}, h('i', { data: { hsBar: true } })),
      h('span.hs__count', {}, h('b', { data: { hsCurrent: true } }, '01'), ` / ${String(s.items.length).padStart(2, '0')}`))));
  return root;
}

/* ═════════════════ Documents ═════════════════ */
export function docs(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h1' });
  const root = shell(s, `docs tone-${s.tone || 'ink'}`, titleId);
  const featured = s.featured && h('ul.docs__featured', { role: 'list' }, s.featured.map((d) => h('li', {}, h('a.doc-card', { href: content.href(d.href), target: '_blank', rel: 'noopener noreferrer', data: { cursor: 'open' } },
    h('span.doc-card__media', {}, photo(d.media, { sizes: '(min-width: 64em) 28vw, 80vw' })),
    h('span.doc-card__title', {}, d.title, h('span.u-visually-hidden', {}, ` ${content.ui('newTab')}`)),
    h('span.doc-card__icon', { aria: { hidden: 'true' } }, icon('external'))))));
  const groups = s.groups && h('div.docs__groups', {}, s.groups.map((g) => h('section.docs__group', { 'aria-labelledby': uid('dg') },
    h('h3.t-h3.docs__group-title', { id: undefined }, g.title),
    h('ul', { role: 'list' }, g.items.map((d) => h('li', {}, btn({ label: d.label, href: d.href, to: d.to, variant: 'link', icon: 'doc', class: 'doc-link' })))))));
  groups?.querySelectorAll('section').forEach((sec) => { const t = sec.querySelector('h3'); t.id = sec.getAttribute('aria-labelledby'); });
  root.append(h('div.container', {}, head, featured, groups, s.blocks && renderBlocks(s.blocks)));
  return root;
}

/* ═════════════════ People ═════════════════ */
export function people(s) {
  const { el: head, titleId } = sectionHead(s);
  const root = shell(s, `people tone-${s.tone || 'paper'}`, titleId);
  root.append(h('div.container', {}, head, h('ul.people__grid', { role: 'list' }, s.items.map((p) => h('li.person', {}, h('p.person__name.t-h3', {}, p.name), h('p.person__role.small', {}, p.role))))));
  return root;
}

/* ═════════════════ Pathway picker ═════════════════ */
export function picker(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h2' });
  const root = shell(s, `picker tone-${s.tone || 'brand'}`, titleId, { data: { picker: true } });
  const gid = uid('picker');
  const radio = (name, opt, onId) => h('label', { class: 'chip-radio', data: { cursor: 'pick' } },
    h('input', { type: 'radio', name, value: opt.id, data: { opt: opt.id } }),
    h('span.chip-radio__face', {}, opt.label));

  const who = h('fieldset.picker__step', { data: { step: 'who' } },
    h('legend.picker__legend', {}, s.who.legend),
    h('div.picker__options', {}, s.who.options.map((o) => radio(`${gid}-who`, o))));

  const whySteps = Object.entries(s.steps).map(([key, step]) => h('fieldset', { class: 'picker__step', data: { step: key }, hidden: true },
    h('legend.picker__legend', {}, step.legend),
    h('div.picker__options', {}, step.options.map((o) => radio(`${gid}-${key}`, o)))));

  const result = h('div.picker__result', { role: 'status', 'aria-live': 'polite', data: { pickerResult: true } },
    h('p.picker__placeholder.small', {}, s.placeholder));

  // Results are stored as JSON on the element so the interaction module stays content-agnostic.
  root.dataset.results = JSON.stringify(Object.fromEntries(Object.values(s.steps).flatMap((st) => st.options.map((o) => [o.id, o.result]))));
  root.append(h('div.container', {}, head, h('form.picker__form', { novalidate: true, onsubmit: (e) => e.preventDefault() }, who, ...whySteps, result)));
  return root;
}

/* ═════════════════ Contact form ═════════════════ */
export function contactForm(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h1' });
  const root = shell(s, `contact tone-${s.tone || 'paper'}`, titleId);
  const fid = uid('f');
  const field = (f) => {
    const id = `${fid}-${f.id}`;
    const control = f.type === 'textarea'
      ? h('textarea', { id, name: f.id, rows: f.rows || 6, required: f.required, autocomplete: f.autocomplete })
      : f.type === 'select'
        ? h('select', { id, name: f.id, required: f.required }, h('option', { value: '' }, f.placeholder || ''), f.options.map((o) => h('option', { value: o }, o)))
        : h('input', { id, name: f.id, type: f.type || 'text', required: f.required, autocomplete: f.autocomplete });
    return h('div', { class: `field field--${f.width || 'full'}` },
      h('label', { for: id }, f.label, f.required && h('span.field__req', { 'aria-hidden': 'true' }, ' *')),
      control,
      h('p.field__error.small', { id: `${id}-err`, role: 'alert' }));
  };
  const form = h('form.contact__form', { novalidate: true, data: { contactForm: true, endpoint: s.endpoint || null }, 'aria-describedby': `${fid}-note` },
    h('p.small', { id: `${fid}-note` }, s.requiredNote),
    h('div.contact__fields', {}, s.fields.map(field)),
    btn({ label: s.submit, variant: 'solid', type: 'submit', icon: 'arrow', size: 'lg' }),
    h('p.contact__status', { role: 'status', 'aria-live': 'polite', data: { formStatus: true }, tabindex: '-1' }));
  form.dataset.success = s.success;
  form.dataset.errorSummary = s.errorSummary || '';
  const aside = s.details && h('aside.contact__details', { 'aria-label': s.details.label },
    s.details.items.map((d) => h('div', {}, h('p.eyebrow', {}, d.label), d.lines.map((l) => (l.href ? h('p', {}, h('a.text-link', { href: l.href }, l.text)) : h('p', {}, l.text))))));
  root.append(h('div.container.contact__grid', {}, h('div', {}, head, aside), form));
  return root;
}
