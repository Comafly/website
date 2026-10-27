import { clamp, ease, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';

/**
 * PAINT REVEAL. The section pins with its content vertically centred; once it is centred, N textured brush strokes
 * sweep left → right down the copy box (a CSS mask over a red background), painting it red and uncovering the white text.
 * Each stroke is a canvas-drawn dry-brush image (bristle streaks, ragged tail). Scroll sets --p0 … --pN (0 → 1).
 */
const N = 11;
const NARROW = window.matchMedia('(max-width: 63.99em)');
const IMG_W = 1.15;                                    // stroke image width relative to the box; its tail is the last 15%
const rnd = (seed) => { let t = seed * 9301 + 49297; return () => ((t = (t * 9301 + 49297) % 233280) / 233280); };

function brush(i) {
  const W = 1400, H = 260, r = rnd(i * 7 + 11);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (i % 2) { g.translate(W, 0); g.scale(-1, 1); }                 // odd strokes are mirrored: they sweep right → left
  g.translate(W / 2, H / 2); g.rotate(((i % 2 ? 1 : -1) * (0.7 + r() * 1.1) * Math.PI) / 180); g.translate(-W / 2, -H / 2);
  const top = H * 0.2, bot = H * 0.8, body = W * 0.9;
  for (let y = top; y < bot; y += 1.6) {
    const edge = Math.min(y - top, bot - y) / ((bot - top) / 2);          // 0 at the brush edge → 1 in the middle
    const len = body + (W - body) * Math.pow(r(), 1.7) * (0.4 + 0.6 * edge) - (1 - edge) * W * 0.05 * r();
    g.globalAlpha = 0.82 + r() * 0.18;
    g.fillStyle = '#000';
    g.fillRect(-20, y, len + 20, 1.9 + r() * 0.6);
    // dry-brush gaps in the tail: scratches through the bristle
    if (r() < 0.65) { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; const gs = body * (1.0 + r() * 0.04); g.fillRect(gs, y, Math.max(0, len - gs) * (0.2 + r() * 0.6), 1.7); g.globalCompositeOperation = 'source-over'; }
  }
  // paint blobs / flecks beyond the tail
  g.globalAlpha = 0.9;
  for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(W * (0.9 + r() * 0.095), top + r() * (bot - top), 0.8 + r() * 2.2, 0, 7); g.fill(); }
  return `url(${c.toDataURL('image/png')})`;
}

export function initPaint(root = document) {
  const list = [...root.querySelectorAll('[data-paint]')].map((el) => new Paint(el));
  const sync = () => list.forEach((p) => p.setMode());
  motion.onChange(sync); NARROW.addEventListener?.('change', sync);
  sync();
}

class Paint {
  constructor(el) {
    this.el = el; this.copy = el.querySelector('.paint__copy'); this.sticky = el.querySelector('.paint__sticky');
    this.top = 0; this.range = 1; this.free = false; this.copyTop = 0; this.last = -1; this.active = false; this.imgs = null;
    onMeasure(() => {
      if (!this.active) return;
      // short windows: if the pinned content would not fit, let it scroll normally and paint as it passes
      const navPad = parseFloat(getComputedStyle(el).getPropertyValue('--nav-pad')) || 72;
      const tall = this.sticky.offsetHeight + navPad > scroll.vh;
      if (tall !== this.free) { this.free = tall; el.classList.toggle('is-free', tall); }
      this.copyTop = pageTop(this.copy);
      el.style.setProperty('--stage-h', `${this.sticky.offsetHeight}px`);
      this.top = pageTop(el) - (parseFloat(getComputedStyle(this.sticky).top) || 0);
      this.range = Math.max(1, el.offsetHeight - this.sticky.offsetHeight);
    });
    onFrame(() => this.frame());
  }

  setMode() {
    const on = !motion.reduced && !NARROW.matches && CSS.supports('mask-image', 'none');
    this.active = on;
    this.el.classList.toggle('is-static', !on);
    const s = this.copy.style;
    if (on) {
      this.imgs ||= Array.from({ length: N }, (_, i) => brush(i));
      const band = 100 / N, hh = band * 3;
      const size = Array.from({ length: N }, () => `${IMG_W * 100}% ${hh}%`).join(',');
      const pos = Array.from({ length: N }, (_, i) => `calc(${i % 2 ? '100% - ' : ''}(1 - var(--p${i}, 0)) * ${((IMG_W / (IMG_W - 1)) * 100).toFixed(1)}%) ${((i / (N - 1)) * 100).toFixed(1)}%`).join(',');
      for (const p of ['mask', '-webkit-mask']) {
        s.setProperty(`${p}-image`, this.imgs.join(','));
        s.setProperty(`${p}-size`, size);
        s.setProperty(`${p}-position`, pos);
        s.setProperty(`${p}-repeat`, 'no-repeat');
      }
      this.last = -1;
    } else {
      for (const p of ['mask', '-webkit-mask']) for (const k of ['image', 'size', 'position', 'repeat']) s.removeProperty(`${p}-${k}`);
      this.el.style.removeProperty('--stage-h');
    }
  }

  frame() {
    if (!this.active) return;
    // first stretch of the scroll is the hold (section pinned & centred), then the strokes
    let p;
    if (this.free) p = clamp((scroll.y + scroll.vh * 0.8 - this.copyTop) / (scroll.vh * 0.75));
    else p = clamp((clamp((scroll.y - this.top) / this.range) - 0.14) / 0.8);
    if (Math.abs(p - this.last) < 0.0005) return;
    this.last = p;
    const span = 0.34, gap = (1 - span) / (N - 1);
    for (let i = 0; i < N; i++) this.copy.style.setProperty(`--p${i}`, ease.inOutCubic(clamp((p - i * gap) / span)).toFixed(4));
  }
}
