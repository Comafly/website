import { clamp, ease, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';

/**
 * NEWSLETTER SHEETS
 * A pinned stage (tall section, sticky inner) whose scroll progress turns full-section sheets like pages: each
 * sheet is hinged on its left edge, swings away in perspective with a moving shade, and uncovers the next one,
 * whose content rises into place. Transform / opacity only.
 * Under reduced motion, or on narrow screens, the sheets are stacked normally and nothing is pinned.
 */
const NARROW = window.matchMedia('(max-width: 63.99em)');
const A = 0.04, B = 0.92;                         // dwell at the start; share of the scroll used for turning

export function initBooks(root = document) {
  const list = [...root.querySelectorAll('[data-sheets]')].map((el) => new Sheets(el));
  const sync = () => list.forEach((b) => b.setMode());
  motion.onChange(sync);
  NARROW.addEventListener?.('change', sync);
  sync();
}

class Sheets {
  constructor(el) {
    this.el = el;
    this.sheets = [...el.querySelectorAll('.sheet')];
    this.n = this.sheets.length - 1;
    this.top = 0; this.range = 1; this.static = false; this.last = -1;
    onMeasure(() => { this.top = pageTop(el); this.range = Math.max(1, el.offsetHeight - scroll.vh); });
    onFrame((s) => this.update(s));
    // keyboard users: focusing something on a turned-away sheet scrolls to that sheet
    this.sheets.forEach((sh, k) => sh.addEventListener('focusin', () => {
      if (this.static || k === Math.round(this.t || 0)) return;
      window.scrollTo({ top: this.top + this.range * (A + B * k / this.n) + 1, behavior: 'auto' });
    }));
  }

  setMode() {
    this.static = motion.reduced || NARROW.matches;
    this.el.classList.toggle('is-static', this.static);
    this.last = -1;
    if (this.static) this.sheets.forEach((sh) => { sh.style.cssText = ''; sh.removeAttribute('data-turned'); });
  }

  update(s) {
    if (this.static) return;
    if (s.y < this.top - s.vh * 1.1 || s.y > this.top + this.range + s.vh * 1.1) return;
    const p = clamp((s.y - this.top) / this.range);
    this.render(clamp((p - A) / B) * this.n);
  }

  /** t = number of sheets turned (0 … n), fractional while one is mid-turn. */
  render(t) {
    const key = Math.round(t * 500);
    if (key === this.last) return;
    this.last = key; this.t = t;
    this.sheets.forEach((sh, k) => {
      const q = ease.inOutCubic(clamp(t - k));                    // 0 → 1 as this sheet turns away
      const mid = Math.sin(Math.PI * q);
      const into = clamp(t - (k - 1));                            // 0 → 1 as this sheet is uncovered
      const last = k === this.n;
      sh.style.transform = last ? '' : `rotateY(${(-118 * q).toFixed(2)}deg)`;
      sh.style.zIndex = this.sheets.length - k;
      sh.style.setProperty('--shade', (mid * 0.6).toFixed(3));
      sh.style.setProperty('--under', (k === 0 ? 1 : ease.outCubic(into)).toFixed(3));
      sh.style.setProperty('--dim', (k === 0 ? 0 : (1 - into) * 0.55).toFixed(3));
      sh.dataset.turned = q >= 0.999 ? '1' : '0';
    });
  }
}
