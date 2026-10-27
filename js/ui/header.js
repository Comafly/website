import { config } from '../config.js';
import { onFrame, measureAll } from '../core/ticker.js';
import { $, $$ } from '../core/dom.js';

/**
 * Header behaviour
 *  • Compact on scroll down, full size on ANY upward scroll or at the top (eased in CSS).
 *  • Patreon-style mega menu: hover/focus a page on the left → page selection row with that
 *    page's anchors beneath. Escape closes, ArrowDown steps into the panel.
 *  • Mobile: disclosure menu with a page → anchors accordion.
 */
export function initHeader() {
  const header = $('#site-header');
  const mega = $('[data-mega]', header);
  const links = $$('[data-mega-for]', header);
  const tabs = $$('[data-mega-tab]', header);
  const panels = $$('[data-mega-panel]', header);
  const toggle = $('[data-menu-toggle]', header);
  const mobile = $('[data-mobile-nav]', header);
  let lastY = scrollY;
  let state = 'full';

  /* ── compact / expand ── */
  onFrame((s) => {
    const y = s.y;
    const dy = y - lastY;
    if (y <= 2) setState('full');
    else if (dy > 2 && y > config.scroll.compactAfter) setState('compact');
    else if (dy < -config.scroll.expandDelta) setState('full');
    lastY = y;
  });
  function setState(next) {
    if (next === state || header.classList.contains('is-menu')) return;
    state = next;
    header.classList.toggle('is-compact', next === 'compact');
  }

  /* ── mega ── */
  let openId = null, openT = 0, closeT = 0;
  mega.inert = true;
  const show = (id) => {
    clearTimeout(closeT);
    if (openId !== id) {
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.megaPanel === id));
      tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.megaTab === id));
      links.forEach((l) => l.setAttribute('aria-expanded', String(l.dataset.megaFor === id)));
    }
    openId = id;
    mega.inert = false;
    mega.classList.add('is-open');
    header.classList.add('is-mega');
  };
  const hide = () => {
    clearTimeout(openT);
    openId = null;
    mega.classList.remove('is-open');
    mega.inert = true;
    header.classList.remove('is-mega');
    links.forEach((l) => l.setAttribute('aria-expanded', 'false'));
  };
  const schedOpen = (id, ms = 70) => { clearTimeout(closeT); clearTimeout(openT); openT = setTimeout(() => show(id), openId ? 0 : ms); };
  const schedClose = (ms = 220) => { clearTimeout(openT); clearTimeout(closeT); closeT = setTimeout(hide, ms); };

  links.forEach((l, i) => {
    l.addEventListener('pointerenter', () => schedOpen(l.dataset.megaFor));
    l.addEventListener('focus', () => show(l.dataset.megaFor));
    l.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); show(l.dataset.megaFor); const first = $(`[data-mega-panel="${l.dataset.megaFor}"] a`, mega); first?.focus(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); links[(i + 1) % links.length].focus(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); links[(i - 1 + links.length) % links.length].focus(); }
    });
  });
  tabs.forEach((t, i) => {
    t.addEventListener('pointerenter', () => show(t.dataset.megaTab));
    t.addEventListener('focus', () => show(t.dataset.megaTab));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(i + 1) % tabs.length].focus(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); tabs[(i - 1 + tabs.length) % tabs.length].focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); $(`[data-mega-panel="${t.dataset.megaTab}"] a`, mega)?.focus(); }
    });
  });
  mega.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && e.target.closest('[data-mega-panel]')) {
      const items = $$('a', e.target.closest('[data-mega-panel]'));
      if (items[0] === e.target) { e.preventDefault(); $(`[data-mega-tab="${openId}"]`, mega)?.focus(); }
    }
  });
  header.addEventListener('pointerleave', () => schedClose());
  header.addEventListener('pointerenter', () => clearTimeout(closeT));
  header.addEventListener('focusout', (e) => { if (!header.contains(e.relatedTarget)) schedClose(80); });
  header.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (header.classList.contains('is-menu')) { closeMenu(true); return; }
    if (openId) { const opener = $(`[data-mega-for="${openId}"]`, header); hide(); opener?.focus(); }
  });
  mega.addEventListener('click', (e) => { if (e.target.closest('a')) hide(); });

  /* ── mobile menu ── */
  function openMenu() {
    header.classList.add('is-menu');
    header.classList.remove('is-compact');
    mobile.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('nav-open');
    $('#main')?.setAttribute('inert', '');
    $('#site-footer')?.setAttribute('inert', '');
  }
  function closeMenu(refocus = false) {
    header.classList.remove('is-menu');
    header.classList.toggle('is-compact', state === 'compact');
    mobile.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('nav-open');
    $('#main')?.removeAttribute('inert');
    $('#site-footer')?.removeAttribute('inert');
    if (refocus) toggle.focus();
  }
  toggle.addEventListener('click', () => (toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu()));
  mobile.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  matchMedia('(min-width: 64em) and (hover: hover)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });
}
