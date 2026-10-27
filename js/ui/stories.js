import { $$ } from '../core/dom.js';
import { motion } from '../core/motion.js';

/** Stories carousel behaviour: arrow buttons, keyboard, position read-out. Scrolling itself is native scroll-snap. */
export function initStories(root = document) {
  $$('[data-stories]', root).forEach((sec) => {
    const track = sec.querySelector('[data-stories-track]');
    const prev = sec.querySelector('[data-stories-prev]');
    const next = sec.querySelector('[data-stories-next]');
    const count = sec.querySelector('[data-stories-count]');
    const cards = [...track.children];
    const label = (n) => (cards[0]?.getAttribute('aria-label') || '').replace(/\d+/, n);

    const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth);
    const index = () => Math.round(track.scrollLeft / Math.max(1, step()));
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
      const first = index() + 1;
      const perView = Math.max(1, Math.round(track.clientWidth / Math.max(1, step())));
      const last = Math.min(cards.length, first + perView - 1);
      count.textContent = `${String(first).padStart(2, '0')}${last > first ? `–${String(last).padStart(2, '0')}` : ''} / ${String(cards.length).padStart(2, '0')}`;
    };
    const go = (dir) => track.scrollTo({ left: track.scrollLeft + dir * step() * Math.max(1, Math.floor(track.clientWidth / step()) - 0), behavior: motion.reduced ? 'auto' : 'smooth' });

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    addEventListener('resize', update);
    // keep keyboard focus visible: tabbing into an off-screen card scrolls it into view
    track.addEventListener('focusin', (e) => e.target.closest('.story')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: motion.reduced ? 'auto' : 'smooth' }));
    update();
  });
}
