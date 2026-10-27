import { clamp, motion } from '../core/motion.js';
import { onFrame } from '../core/ticker.js';

/** Running text. Base drift plus scroll velocity; flips direction when you scroll up. */
export function initMarquees(root = document) {
  const items = [...root.querySelectorAll('[data-marquee]')].map((track) => {
    const unit = track.querySelector('.marquee__unit');
    return { track, unit, speed: Number(track.dataset.marquee) || 1, x: 0, w: 0, dir: 1 };
  });
  if (!items.length) return;
  const measure = () => items.forEach((it) => { it.w = it.unit.getBoundingClientRect().width; });
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  setTimeout(measure, 300);
  onFrame((s) => {
    if (motion.reduced) return;
    for (const it of items) {
      if (!it.w) { it.w = it.unit.getBoundingClientRect().width; continue; }
      const boost = clamp(s.vel / 1400, -4, 4);
      it.dir += (s.dir - it.dir) * 0.08;
      it.x -= (60 * it.speed * it.dir + boost * 420 * it.speed) * s.dt;
      if (it.x <= -it.w) it.x += it.w;
      if (it.x > 0) it.x -= it.w;
      it.track.style.transform = `translate3d(${it.x.toFixed(1)}px,0,0)`;
    }
  });
}
