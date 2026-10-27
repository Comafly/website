import { $$ } from '../core/dom.js';
import { motion } from '../core/motion.js';

const AUTO = [
  '.section-head .eyebrow', '.section-head .lead', '.prose > *', '.actions', '.stat', '.doc-card', '.docs__group',
  '.person', '.date-card', '.callout', '.acc', '.steps__item', '.mini-card', '.rate', '.field', '.statement__caption',
  '.footer__col', '.footer__ack', '.phero__lead', '.phero__chips', '.block-group', '.tabs__list',
].join(',');
const SKIP = '.hs, .seq, .banner, .marquee, .mobile-nav, .mega, dialog';

/** IntersectionObserver-driven entrances. CSS (utilities/_reveal.scss) supplies the easing. */
export function initReveal(root = document) {
  $$(AUTO, root).forEach((el) => { if (!el.hasAttribute('data-reveal') && !el.closest(SKIP)) el.dataset.reveal = 'up'; });
  const els = $$('[data-reveal]', root);

  // Slice curtains for photographs.
  els.filter((el) => el.dataset.reveal === 'slices' && !el.querySelector('.slices')).forEach((el) => {
    const s = document.createElement('span');
    s.className = 'slices';
    s.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) { const b = document.createElement('i'); b.style.setProperty('--i', i); s.append(b); }
    el.append(s);
  });

  // Stagger siblings that share a parent.
  const groups = new Map();
  els.forEach((el) => { const p = el.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el); });
  groups.forEach((list) => list.forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8))));

  if (motion.reduced || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  // Clipped elements (image / slices) are invisible to the observer while fully clipped, so watch their container instead.
  const watch = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      (watch.get(en.target) || []).forEach((el) => el.classList.add('is-in'));
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  els.forEach((el) => {
    const clipped = el.dataset.reveal === 'image' || el.dataset.reveal === 'slices';
    const t = clipped && el.parentElement ? el.parentElement : el;
    if (!watch.has(t)) { watch.set(t, []); io.observe(t); }
    watch.get(t).push(el);
  });
  motion.onChange((r) => { if (r) els.forEach((el) => el.classList.add('is-in')); });
}
