import { config } from '../config.js';
import { clamp, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop } from '../core/ticker.js';

/**
 * Subtle parallax.
 *   img[data-plx-img] inside a .ph frame drifts ±10% of the frame as it crosses the viewport.
 *   [data-parallax="0.2"] translates any element at that fraction of the scroll offset.
 * Images inside pinned sequences / horizontal tracks are handled by their own modules.
 */
const OWN = '.hs, .seq, .banner, .phero, .mega, dialog';

export function initParallax(root = document) {
  if (!config.effects.parallax) return;
  const imgs = [...root.querySelectorAll('.ph img[data-plx-img]')]
    .filter((i) => !i.closest(OWN))
    .map((el) => ({ el, frame: el.closest('.ph'), top: 0, h: 0 }));
  const gens = [...root.querySelectorAll('[data-parallax]')].map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || 0.1, top: 0, h: 0 }));

  const measure = () => {
    imgs.forEach((it) => { it.top = pageTop(it.frame); it.h = it.frame.offsetHeight; });
    gens.forEach((it) => { it.top = pageTop(it.el); it.h = it.el.offsetHeight; });
  };
  onMeasure(measure);
  const clear = () => { imgs.forEach((i) => { i.el.style.transform = ''; }); gens.forEach((g) => { g.el.style.transform = ''; }); };
  motion.onChange((r) => r && clear());

  onFrame((s) => {
    if (motion.reduced) return;
    for (const it of imgs) {
      const delta = it.top + it.h / 2 - (s.sy + s.vh / 2);
      const t = clamp(delta / ((s.vh + it.h) / 2), -1, 1);
      if (Math.abs(t) >= 1) continue;
      it.el.style.transform = `translate3d(0, ${(-t * it.h * 0.1).toFixed(1)}px, 0) scale(1.14)`;
    }
    for (const g of gens) {
      const delta = g.top + g.h / 2 - (s.sy + s.vh / 2);
      if (Math.abs(delta) > s.vh * 1.2) continue;
      g.el.style.transform = `translate3d(0, ${(-delta * g.speed).toFixed(1)}px, 0)`;
    }
  });
}
