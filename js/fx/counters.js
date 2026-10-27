import { clamp, ease, motion } from '../core/motion.js';

/** Count-up numbers; the final value is always present for screen readers. */
export function initCounters(root = document) {
  const els = [...root.querySelectorAll('[data-count]')];
  const fmt = (el, v) => {
    const n = Math.round(v);
    return (el.dataset.group ? n.toLocaleString('en-AU') : String(n)) + (el.dataset.suffix || '');
  };
  const run = (el) => {
    const target = Number(el.dataset.count);
    const out = el.querySelector('.stat__num');
    if (motion.reduced) { out.textContent = fmt(el, target); return; }
    const dur = 1800 + Math.min(1600, Math.log10(target + 1) * 420);
    const t0 = performance.now();
    const step = (t) => {
      const k = clamp((t - t0) / dur);
      out.textContent = fmt(el, target * ease.outExpo(k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } }), { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}
