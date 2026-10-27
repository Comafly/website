import { clamp, ease, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';

/**
 * RGB-registration scene (see render/spotlight.js). Transform + opacity + one CSS variable only.
 *   0.00–0.55  red, green, blue copies wipe in (mask panel slides, its photo counter-slides)
 *   0.00–0.75  each copy drifts at its own parallax speed and offset
 *   0.42–0.77  the copies converge and register as the full-colour photograph
 *   0.42–1.00  the finished photo keeps a slow push-in; the copy rises
 */
const CH = {
  r: { dir: [-1, 0], start: 0.0, off: [-0.035, -0.012], speed: 0.1 },
  g: { dir: [0, 1], start: 0.12, off: [0.012, 0.03], speed: 0 },
  b: { dir: [1, 0], start: 0.24, off: [0.035, -0.01], speed: -0.1 },
};

export function initSpotlights(root = document) {
  const all = [...root.querySelectorAll('[data-spot]')].map((el) => new Spot(el));
  const onMotion = (r) => all.forEach((s) => s.setStatic(r));
  onMotion(motion.reduced);
  motion.onChange(onMotion);
}

class Spot {
  constructor(el) {
    this.el = el;
    this.chs = [...el.querySelectorAll('[data-spot-ch]')].map((n) => ({ el: n, in: n.querySelector('[data-spot-in]'), k: CH[n.dataset.spotCh] }));
    this.glow = el.querySelector('[data-spot-glow]');
    this.copy = el.querySelector('[data-spot-copy]');
    this.top = 0; this.range = 1; this.static = false;
    onMeasure(() => { this.top = pageTop(el); this.range = Math.max(1, el.offsetHeight - scroll.vh); });
    onFrame((s) => this.update(s));
  }

  setStatic(on) {
    this.static = on;
    this.el.classList.toggle('is-static', on);
    if (on) [...this.chs.flatMap((c) => [c.el, c.in]), this.copy, this.glow].forEach((n) => n?.removeAttribute('style'));
  }

  update(s) {
    if (this.static) return;
    if (s.y < this.top - s.vh * 1.1 || s.y > this.top + this.range + s.vh * 1.1) return;
    const p = clamp((s.y - this.top) / this.range);
    const W = s.vw, H = s.vh;
    const conv = ease.inOutCubic(clamp((p - 0.42) / 0.35));
    const push = 1.02 + 0.07 * ease.outCubic(clamp((p - 0.3) / 0.7));       // slow push-in on the finished photo
    const lift = (0.5 - p) * H * 0.05;                                       // shared parallax (all layers agree)

    this.chs.forEach(({ el, in: inner, k }) => {
      const t = ease.inOutCubic(clamp((p - k.start) / 0.32));
      const mx = k.dir[0] * (1 - t) * W, my = k.dir[1] * (1 - t) * H;       // sliding mask panel
      const spread = 1 - conv;
      const ox = k.off[0] * W * spread, oy = k.off[1] * H * spread + (p - 0.5) * H * k.speed * spread * 2;
      el.style.transform = `translate3d(${mx.toFixed(1)}px, ${my.toFixed(1)}px, 0)`;
      el.style.setProperty('--edge', (t > 0.01 && t < 0.99 ? 1 : 0).toString());
      inner.style.transform = `translate3d(${(-mx + ox).toFixed(1)}px, ${(-my + oy + lift).toFixed(1)}px, 0) scale(${push.toFixed(4)})`;
    });

    // the backdrop light drifts slowly across the stage as you scroll (transform only)
    if (this.glow) {
      const gx = (-0.22 + 0.44 * p) * W, gy = (0.14 - 0.28 * p + Math.sin(p * Math.PI * 2) * 0.05) * H;
      this.glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0) scale(${(1 + 0.12 * Math.sin(p * Math.PI)).toFixed(3)})`;
    }

    const r = clamp((p - 0.5) / 0.34);
    this.copy.style.setProperty('--r', ease.outCubic(r).toFixed(3));
  }
}
