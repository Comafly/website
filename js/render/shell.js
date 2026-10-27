import { h, uid } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { content } from '../core/content.js';
import { richInline, paras } from '../core/rich.js';
import { photo, btn, isExternal } from './parts.js';

/* ═════════════════ Skip link ═════════════════ */
export const skipLink = () => h('a.skip-link', { href: '#main' }, content.ui('skip'));

/* ═════════════════ Header + mega menu + mobile menu ═════════════════ */
export function buildHeader() {
  const { site } = content;
  const current = content.pageMeta.id;
  const navPages = site.pages.filter((p) => p.nav);
  const entry = (id) => site.nav.find((n) => n.page === id);

  const primary = h('nav.primary-nav', { 'aria-label': content.ui('nav.main') },
    h('button.menu-toggle', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'mobile-nav', data: { menuToggle: true } },
      h('span.menu-toggle__bars', { aria: { hidden: 'true' } }, h('i'), h('i')),
      h('span.menu-toggle__label', {}, content.ui('nav.menu'))),
    h('ul.primary-nav__list', { role: 'list' }, navPages.map((p) => h('li', {},
      h('a', { class: 'primary-nav__link', href: p.href, 'aria-current': p.id === current ? 'page' : null, 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': 'mega', data: { megaFor: p.id } },
        h('span.primary-nav__text', {}, p.label))))));

  const brand = h('a.brand', { href: site.pages[0].href, 'aria-label': content.ui('brand.homeLabel'), 'aria-current': current === site.pages[0].id ? 'page' : null },
    h('img.brand__logo', { src: 'assets/side-logo.png', alt: '', width: 350, height: 131 }));

  const actions = h('div.header-actions', {},
    h('button.icon-btn', { type: 'button', 'aria-haspopup': 'dialog', data: { open: 'search' } }, icon('search'), h('span.icon-btn__label', {}, content.ui('nav.search'))),
    h('a.icon-btn', { href: content.href(site.contact.to) }, icon('mail'), h('span.icon-btn__label', {}, content.ui('nav.contact'))),
    h('button.pill', { type: 'button', 'aria-haspopup': 'dialog', data: { open: 'login' } }, icon('user'), h('span', {}, content.ui('nav.login'))));

  // Mega panel: page selection on top, that page's anchors underneath.
  const mega = h('div.mega', { id: 'mega', data: { mega: true }, role: 'group', 'aria-label': content.ui('nav.sections') },
    h('div.mega__inner.container', {},
      h('div.mega__panels', {}, navPages.map((p) => {
        const e = entry(p.id);
        return h('div.mega__panel', { data: { megaPanel: p.id } },
          h('div.mega__col', {},
            h('ul.mega__anchors', { role: 'list' }, [
              ...(e?.anchors || []).map((a) => h('li', {}, h('a.mega__anchor', { href: `${p.href}#${a.anchor}` }, h('span', {}, a.label), icon('arrow')))),
            ])));
      }))));

  // Mobile navigation: native disclosure per page.
  const mobile = h('div.mobile-nav.tone-ink', { id: 'mobile-nav', data: { mobileNav: true }, hidden: true },
    h('nav', { 'aria-label': content.ui('nav.mobile') },
      h('ul.mnav', { role: 'list' }, navPages.map((p) => {
        const e = entry(p.id);
        return h('li', {}, h('details.mnav__item', {},
          h('summary.mnav__summary', {}, h('span', {}, p.label), h('span.mnav__plus', { aria: { hidden: 'true' } }, icon('plus'))),
          h('ul.mnav__sub', { role: 'list' }, [
            h('li', {}, h('a', { href: p.href, class: 'mnav__page' }, `${content.ui('nav.openPage')} ${p.label}`)),
            ...(e?.anchors || []).map((a) => h('li', {}, h('a', { href: `${p.href}#${a.anchor}` }, a.label))),
          ])));
      }))),
    h('div.mobile-nav__actions', {},
      h('button.btn.btn--outline', { type: 'button', data: { open: 'search' } }, h('span.btn__label', {}, h('span.btn__text', {}, content.ui('nav.search')))),
      h('a.btn.btn--outline', { href: content.href(site.contact.to) }, h('span.btn__label', {}, h('span.btn__text', {}, content.ui('nav.contact')))),
      h('button.btn.btn--solid', { type: 'button', data: { open: 'login' } }, h('span.btn__label', {}, h('span.btn__text', {}, content.ui('nav.login'))))));

  return [h('div.site-header__bar', {}, primary, brand, actions), mega, mobile];
}

/* ═════════════════ Footer ═════════════════ */
export function buildFooter() {
  const f = content.site.footer;
  const col = (c) => h('nav', { class: 'footer__col', 'aria-labelledby': `f-${c.id}` },
    h('h2', { class: 'footer__heading eyebrow', id: `f-${c.id}` }, c.title),
    h('ul', { role: 'list' }, c.links.map((l) => h('li', {}, h('a.footer__link', { href: content.href(l.to || l.href), rel: /^https?:/.test(l.href || '') ? 'noopener noreferrer external' : null, target: /^https?:/.test(l.href || '') ? '_blank' : null }, l.label)))));

  return [
    h('div.footer__hero.container', {},
      h('p', { class: 'footer__lead t-h2' }, f.kicker),
      btn({ label: f.cta.label, to: f.cta.to, variant: 'solid', size: 'lg' })),
    h('div.footer__main.container', {},
      h('section.footer__ack', { 'aria-labelledby': 'f-ack' }, h('h2.eyebrow#f-ack', {}, f.ack.title), h('p', { html: richInline(f.ack.text) })),
      h('div.footer__cols', {},
        h('section.footer__col', { 'aria-labelledby': 'f-contact' },
          h('h2.footer__heading.eyebrow#f-contact', {}, f.contact.title),
          h('address', {}, f.contact.address.map((l, i) => [i ? h('br') : null, l])),
          h('ul', { role: 'list' }, f.contact.links.map((l) => h('li', {}, h('a.footer__link', { href: l.href }, l.label))))),
        f.columns.map(col))),
    h('div.footer__bar.container', {},
      h('p.small', {}, f.legal),
      h('div.footer__tools', {},
        h('button.link-btn', { type: 'button', data: { motionToggle: true }, 'aria-pressed': 'false' }, icon('motion'), h('span', { data: { motionLabel: true } }, content.ui('motion.reduce'))),
        h('button.link-btn', { type: 'button', data: { toTop: true } }, icon('arrowUp'), h('span', {}, content.ui('backToTop'))))),
  ];
}

/* ═════════════════ Dialogs ═════════════════ */
export function buildDialogs() {
  const d = content.site.dialogs;
  const close = (label) => h('button.dialog__close.icon-btn', { type: 'button', 'aria-label': label, data: { close: true } }, icon('close'));

  const searchId = uid('search');
  const search = h('dialog.dialog.dialog--search.tone-ink', { id: 'dialog-search', 'aria-labelledby': `${searchId}-title`, data: { dialog: 'search' } },
    h('div.dialog__inner', {},
      close(d.close),
      h('h2.t-h2', { id: `${searchId}-title` }, d.search.title),
      h('form.search', { role: 'search', 'aria-label': d.search.title, onsubmit: (e) => e.preventDefault() },
        h('label.u-visually-hidden', { for: `${searchId}-q` }, d.search.label),
        h('div.search__field', {}, icon('search'), h('input', { id: `${searchId}-q`, type: 'search', name: 'q', placeholder: d.search.placeholder, autocomplete: 'off', spellcheck: 'false', data: { searchInput: true } }))),
      h('p.search__status.small', { role: 'status', 'aria-live': 'polite', data: { searchStatus: true } }, d.search.hint),
      h('ul.search__results', { role: 'list', data: { searchResults: true } })));

  // Portal login: no form, just the links each audience needs, grouped by who they are for
  const loginId = uid('login');
  const L = d.login;
  const portal = (l) => {
    const external = isExternal(l.href);
    return h('a.portal-link', { href: l.href === '#' ? '#' : (external ? l.href : content.href(l.href)), target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null },
      h('span.portal-link__text', {}, l.label), icon(external ? 'external' : 'arrow'), external && h('span.u-visually-hidden', {}, ` ${content.ui('newTab')}`));
  };
  const login = h('dialog.dialog.dialog--login.tone-ink', { id: 'dialog-login', 'aria-labelledby': `${loginId}-title`, data: { dialog: 'login' } },
    h('div.dialog__inner', {},
      close(d.close),
      h('header.portal__head', {}, L.eyebrow && h('p.eyebrow', {}, L.eyebrow), h('h2.t-h2', { id: `${loginId}-title` }, L.title)),
      h('div.portal', {}, L.groups.map((g) => h('section', { class: `portal__col${g.wide ? ' portal__col--wide' : ''}`, 'aria-labelledby': `${loginId}-${g.id}` },
        h('h3.portal__title', { id: `${loginId}-${g.id}` }, g.title),
        h('div.portal__links', {}, g.links.map(portal))))),
      h('div.portal__reset', {}, L.reset.map((l) => h('a.portal__btn', { href: l.href, target: '_blank', rel: 'noopener noreferrer' }, h('span', {}, l.label), icon('external'), h('span.u-visually-hidden', {}, ` ${content.ui('newTab')}`))))));

  return [search, login];
}

/* ═════════════════ Furniture: curtain, cursor, progress ═════════════════ */
export const buildProgress = () => h('div.progress', { 'aria-hidden': 'true' }, h('i', { data: { progress: true } }));
