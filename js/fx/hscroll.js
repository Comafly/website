import { config } from '../config.js';
import { clamp, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';

/**
 * VERTICAL → HORIZONTAL
 * A tall wrapper pins a full-viewport stage (position: sticky). While you scroll down, the
 * track of cards slides sideways 1:1 with your scroll distance. Photos inside each card drift
 * against the motion for depth. With reduced motion the track becomes a native swipe/scroll strip.
 */
export function initHScroll(root = document) {
  const hs = [...root.querySelectorAll('[data-hs]')].map((el) => new HScroll(el));
  motion.onChange(() => hs.forEach((h) => h.refresh()));
}

class HScroll {
  constructor(el) {
    this.el = el;
    this.pin = el.querySelector('.hs__pin');
    this.track = el.querySelector('[data-hs-track]');
    this.items = [...el.querySelectorAll('.hs__item')].map((li) => ({ li, imgs: [...li.querySelectorAll('.ph img')], left: 0, w: 0 }));
    this.bar = el.querySelector('[data-hs-bar]');
    this.cur = el.querySelector('[data-hs-current]');
    this.travel = 0; this.top = 0; this.native = false; this.lastIdx = -1;

    onMeasure(() => this.layout(), 0);
    onMeasure(() => { this.top = pageTop(this.el); }, 1);
    onFrame((s) => this.update(s));

    // Keyboard users tabbing into an off-screen card: scroll the page so the card is centred.
    this.track.addEventListener('focusin', (e) => {
      if (this.native) return;
      const item = e.target.closest('.hs__item');
      if (!item) return;
      const rec = this.items.find((i) => i.li === item);
      const want = clamp(rec.left + rec.w / 2 - scroll.vw / 2, 0, this.travel);
      window.scrollTo({ top: this.top + want, behavior: 'auto' });
    });
  }

  refresh() { this.layout(); this.top = pageTop(this.el); }

  layout() {
    const { vw, vh } = scroll;
    this.native = motion.reduced || vw < config.hscroll.nativeBelow;
    this.el.classList.toggle('is-native', this.native);
    if (this.native) {
      this.el.style.height = '';
      this.track.style.transform = '';
      this.track.setAttribute('tabindex', '0');
      this.track.setAttribute('role', 'region');
      if (!this.track.hasAttribute('aria-label')) this.track.setAttribute('aria-label', this.el.querySelector('.hs__list')?.getAttribute('aria-label') || '');
      return;
    }
    this.track.removeAttribute('tabindex');
    this.track.removeAttribute('role');
    this.track.style.transform = 'translate3d(0,0,0)';
    this.travel = Math.max(0, this.track.scrollWidth - vw);
    this.el.style.height = `${Math.round(this.travel + vh * (1 + config.hscroll.tail))}px`;
    const trackLeft = this.track.getBoundingClientRect().left + (window.scrollX || 0);
    this.items.forEach((it) => { it.left = it.li.offsetLeft + (it.li.offsetParent === this.track ? 0 : it.li.offsetParent?.offsetLeft || 0); it.w = it.li.offsetWidth; });
  }

  update(s) {
    if (this.native) return;
    const into = s.sy - this.top;
    if (into < -s.vh * 1.2 || into > this.travel + s.vh * 2.4) return;
    const x = clamp(into, 0, this.travel);
    this.track.style.transform = `translate3d(${(-x).toFixed(1)}px, 0, 0)`;

    let best = 0, bestD = Infinity;
    this.items.forEach((it, i) => {
      const cx = it.left + it.w / 2 - x;
      const rel = (cx - s.vw / 2) / s.vw; // −1 … 1 across the viewport
      if (Math.abs(rel) > 1.4) return;
      it.li.style.setProperty('--rel', rel.toFixed(3));
      const shift = -rel * 14;
      it.imgs.forEach((img) => { img.style.transform = `translate3d(${shift.toFixed(2)}%, 0, 0) scale(1.28)`; });
      const d = Math.abs(rel);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (this.bar) this.bar.style.transform = `scaleX(${this.travel ? (x / this.travel).toFixed(4) : 1})`;
    if (best !== this.lastIdx && this.cur) { this.lastIdx = best; this.cur.textContent = String(best + 1).padStart(2, '0'); }
  }
}
