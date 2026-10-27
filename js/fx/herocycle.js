import { clamp, ease, lerp, motion } from '../core/motion.js';
import { scrollToY } from './anchors.js';
import { content } from '../core/content.js';
import { onFrame, scroll } from '../core/ticker.js';

/**
 * HOME HERO: an auto-playing slideshow (no scroll pinning, so scrolling leaves the hero immediately).
 *   - every slide plays for SLIDE_MS; the hairline after its pill fills as time passes, and when it reaches the
 *     next pill that slide loads (the last line loops back to the first)
 *   - the incoming photo is revealed by a mask panel that rises over the old one (transform-only)
 *   - the cycle pauses while the hero is off screen, the tab is hidden, focus is inside it, or the visitor pauses it
 *   - with reduced motion nothing advances by itself; the pills still switch slides
 */
const SLIDE_MS = 8000;
const TRANS_MS = 1400;

export function initHeroCycle(root = document) {
  root.querySelectorAll('[data-hero]').forEach((el) => new HeroCycle(el));
}

class HeroCycle {
  constructor(el) {
    this.el = el;
    this.frames = [...el.querySelectorAll('.seq__frame')];
    this.slides = [...el.querySelectorAll('.seq__slide')];
    this.pills = [...el.querySelectorAll('[data-pill]')];
    this.fills = [...el.querySelectorAll('[data-fill]')];
    this.edge = el.querySelector('.seq__edge');
    this.toggle = el.querySelector('[data-hero-toggle]');
    this.n = this.frames.length;
    this.cur = 0; this.next = 0; this.t = 1;          // t: transition progress of `next` over `cur` (1 = settled)
    this.elapsed = 0; this.userPaused = false; this.focusIn = false;
    this.focusables = this.slides.map((s) => [...s.querySelectorAll('a, button')]);

    this.frames.forEach((fr) => fr.querySelector('img')?.decode?.().catch(() => {}));
    this.pills.forEach((b) => b.addEventListener('click', () => this.go(Number(b.dataset.pill))));
    this.toggle?.addEventListener('click', () => this.setPaused(!this.userPaused));
    el.addEventListener('focusin', (e) => { if (!e.target.closest('.hero-pills__toggle, .scroll-cue')) this.focusIn = true; });
    el.addEventListener('focusout', () => { this.focusIn = false; });
    el.querySelector('.scroll-cue')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const nextSec = el.nextElementSibling;
      const y = nextSec ? nextSec.getBoundingClientRect().top + window.scrollY : el.offsetHeight;
      scrollToY(y, { dur: 900, easing: ease.inOutCubic });
    });
    document.addEventListener('visibilitychange', () => { this.hidden = document.hidden; });
    this.render(0);
    onFrame((s) => this.tick(s));
  }

  setPaused(on) {
    this.userPaused = on;
    this.toggle?.setAttribute('aria-pressed', String(on));
    this.toggle?.setAttribute('aria-label', content.ui(on ? 'hero.play' : 'hero.pause'));
    this.el.classList.toggle('is-paused', on);
  }

  go(i) {
    if (i === this.cur && this.t >= 1) { this.elapsed = 0; return; }
    if (this.t < 1) { this.cur = this.next; }            // finish an in-flight change instantly
    this.next = i; this.t = motion.reduced ? 1 : 0; this.elapsed = 0;
    if (motion.reduced) this.cur = i;
  }

  tick(s) {
    const dt = Math.min(s.dt * 1000, 64);
    const onScreen = s.y < this.el.offsetHeight * 0.9;
    const playing = !motion.reduced && !this.userPaused && !this.focusIn && !this.hidden && onScreen;
    if (playing) {
      if (this.t < 1) this.t = Math.min(1, this.t + dt / TRANS_MS);
      else {
        this.elapsed += dt;
        if (this.elapsed >= SLIDE_MS) { this.next = (this.cur + 1) % this.n; this.t = 0; this.elapsed = 0; }
      }
    } else if (this.t < 1 && !motion.reduced && onScreen) {
      this.t = Math.min(1, this.t + dt / TRANS_MS);       // always finish a transition that has started
    }
    if (this.t >= 1 && this.next !== this.cur) { this.cur = this.next; this.setCurrent(); }
    if (!onScreen) return;
    this.render(this.elapsed / SLIDE_MS);
  }

  setCurrent() {
    this.focusables.forEach((list, i) => list.forEach((f) => (i === this.cur ? f.removeAttribute('tabindex') : f.setAttribute('tabindex', '-1'))));
  }

  render(prog) {
    const a = this.cur, b = this.next, moving = this.t < 1 && a !== b;
    const e = moving ? ease.inOutCubic(this.t) : 1;
    const vh = scroll.vh;
    this.frames.forEach((fr, i) => {
      const inner = fr.firstElementChild, img = fr.querySelector('img');
      const incoming = moving && i === b, outgoing = moving && i === a;
      const settledCur = !moving && i === a;
      fr.style.zIndex = incoming ? 3 : settledCur || outgoing ? 2 : 1;
      // frames that are neither current nor incoming wait below (hidden under the stack by z-order)
      const y = incoming ? 1 - e : (settledCur || outgoing) ? 0 : 1;
      fr.style.transform = `translate3d(0, ${(y * 100).toFixed(2)}%, 0)`;
      inner.style.transform = `translate3d(0, ${(-y * 100).toFixed(2)}%, 0)`;
      // slow push-in while a slide plays; the incoming photo settles into exactly the scale the current one starts from
      let scale = 1.08, drift = 0;
      if (settledCur) scale = 1.08 + 0.06 * prog;
      else if (outgoing) { scale = 1.14 + 0.02 * e; drift = -e * vh * 0.08; }
      else if (incoming) { scale = 1.08 + 0.05 * (1 - e); drift = (1 - e) * vh * 0.06; }
      img.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      fr.style.opacity = outgoing ? (1 - 0.45 * e).toFixed(3) : '1';
    });
    if (this.edge) {
      this.edge.style.opacity = moving && this.t > 0.01 && this.t < 0.99 ? '1' : '0';
      this.edge.style.transform = `translate3d(0, ${((1 - e) * vh).toFixed(1)}px, 0)`;
    }
    // copy
    this.slides.forEach((sl, i) => {
      let vis = 0, y = 0;
      if (!moving) vis = i === a ? 1 : 0;
      else if (i === a) { vis = 1 - ease.outCubic(clamp(this.t / 0.5)); y = -this.t * 60; }
      else if (i === b) { vis = ease.outCubic(clamp((this.t - 0.4) / 0.6)); y = (1 - vis) * 44; }
      sl.style.opacity = vis.toFixed(3);
      sl.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      sl.style.visibility = vis > 0.01 ? 'visible' : 'hidden';
      sl.style.pointerEvents = vis > 0.6 ? 'auto' : 'none';
    });
    // pills + timelines
    const shown = moving ? b : a;
    this.pills.forEach((p, i) => {
      p.classList.toggle('is-active', i === shown);
      p.classList.toggle('is-past', i < shown);
      if (i === shown) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current');
    });
    this.fills.forEach((f, i) => {
      const k = i < shown ? 1 : i === shown ? (moving ? 0 : prog) : 0;
      f.style.transform = `scaleX(${k.toFixed(4)})`;
    });
  }
}
