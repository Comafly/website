import { clamp, ease, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';

/**
 * PINNED STAGES for "How it works". A tall track with a sticky stage; scroll progress writes CSS custom properties
 * that the stylesheet turns into transform / opacity (no layout work in the frame loop).
 *   tools : --s1, --s2  (0 -> 1) bring in the 2nd and 3rd cards, each stacking over the one before
 *   ways  : --s         (0 -> 1) slides the first text left into the second while the second photograph arrives
 * Not pinned (narrow screens / reduced motion): everything is simply stacked and fully visible.
 */
const NARROW = window.matchMedia('(max-width: 63.99em)');

export function initStages(root = document) {
  const list = [...root.querySelectorAll('[data-hstage]')].map((el) => new Stage(el));
  const sync = () => list.forEach((s) => s.setMode());
  motion.onChange(sync);
  NARROW.addEventListener?.('change', sync);
  sync();
}

class Stage {
  constructor(el) {
    this.el = el;
    this.kind = el.dataset.hstage;
    this.sticky = el.querySelector('.hstage__sticky');
    this.top = 0; this.range = 1; this.static = false; this.last = -1;
    onMeasure(() => {
      if (!this.static) el.style.setProperty('--stage-h', `${this.sticky.offsetHeight}px`);
      // progress starts when the sticky stage actually pins (its top reaches its sticky offset), not at the track's top
      this.top = pageTop(el) - (this.static ? 0 : (parseFloat(getComputedStyle(this.sticky).top) || 0));
      this.range = Math.max(1, el.offsetHeight - (this.static ? scroll.vh : this.sticky.offsetHeight));
    });
    onFrame((s) => this.update(s));
  }

  setMode() {
    this.static = motion.reduced || NARROW.matches;
    this.el.classList.toggle('is-static', this.static);
    if (this.static) this.el.style.removeProperty('--stage-h');
    this.last = -1;
  }

  update(s) {
    if (this.static) return;
    if (s.y < this.top - s.vh * 1.1 || s.y > this.top + this.range + s.vh * 1.1) return;
    const p = clamp((s.y - this.top) / this.range);
    const key = Math.round(p * 1500);
    if (key === this.last) return;
    this.last = key;
    const st = this.el.style;
    if (this.kind === 'tools') {
      // hold on each card before the next arrives: Moodle 0–.15, Webex in .15–.4, hold to .6, In Person in .6–.85, hold
      st.setProperty('--s1', ease.inOutCubic(clamp((p - 0.15) / 0.25)).toFixed(4));
      st.setProperty('--s2', ease.inOutCubic(clamp((p - 0.6) / 0.25)).toFixed(4));
    } else {
      st.setProperty('--s', ease.inOutCubic(clamp((p - 0.1) / 0.8)).toFixed(4));
    }
  }
}
