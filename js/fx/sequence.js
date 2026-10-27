import { clamp, ease, lerp, motion } from '../core/motion.js';
import { scrollToY } from './anchors.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';

/**
 * PINNED SCROLL SEQUENCES
 * The section is tall; its inner stage is `position: sticky`. Scroll progress through the
 * section drives which frame is showing. Each frame gets a "hold" (read time) followed by a
 * "transition" window in which the next frame cross-fades in and the old copy exits.
 * Only opacity/transform are animated (compositor-friendly) and the raw scroll position is used,
 * so the pinned stage never lags behind the page.
 *
 *   variants: hero | words | split | stage   (markup from render/hero.js and render/sequence.js)
 */
const HOLD = 0.6; // fraction of each segment spent holding on a frame

export function initSequences(root = document) {
  const seqs = [...root.querySelectorAll('[data-seq]')].map((el) => new Sequence(el));
  const onMotion = (reduced) => seqs.forEach((s) => s.setStatic(reduced));
  onMotion(motion.reduced);
  motion.onChange(onMotion);
}

class Sequence {
  constructor(el) {
    this.el = el;
    this.variant = el.dataset.seq;
    this.n = Number(el.dataset.frames);
    this.sticky = el.querySelector('.seq__sticky');
    this.frames = [...el.querySelectorAll('.seq__frame, .seq__panel')];
    this.slides = [...el.querySelectorAll('.seq__slide, .seq__word-wrap')];
    this.texts = [...el.querySelectorAll('.seq__text')];
    this.bgs = [...el.querySelectorAll('.seq__bg')];
    this.ticks = [...el.querySelectorAll('[data-tick]')];
    this.mask = el.querySelector('[data-seq-mask]');
    if (this.variant === 'hero') this.frames.forEach((fr) => fr.querySelector('img')?.decode?.().catch(() => {}));
    this.edge = el.querySelector('.seq__edge');
    this.counter = el.querySelector('[data-seq-current]');
    this.hold = this.variant === 'words' ? 0 : HOLD;
    this.glow = el.querySelector('.seq__glow'); this.prog = el.querySelector('.seq__prog');
    this.top = 0; this.range = 1; this.active = -1; this.static = false;
    this.focusables = this.slides.map((s) => [...s.querySelectorAll('a, button')]);

    onMeasure(() => { this.top = pageTop(this.el); this.range = Math.max(1, this.el.offsetHeight - scroll.vh); });
    onFrame((s) => this.update(s));

    // The "scroll" cue steps to the next frame (and, on the last frame, onto the next section)
    // instead of jumping past the whole pinned sequence.
    const cue = el.querySelector('.scroll-cue');
    cue?.addEventListener('click', (e) => {
      if (this.static) return;
      e.preventDefault(); e.stopPropagation();
      // glide through every remaining frame and out to the next section at a steady, unhurried pace
      const y = this.top + this.range + scroll.vh;
      const dist = Math.abs(y - window.scrollY);
      scrollToY(y, { dur: clamp(dist * 2.4, 3500, 14000), easing: ease.inOutSine });
    });

    // Progress dots are buttons: jump straight to that frame
    el.querySelectorAll('[data-go]').forEach((btn) => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.go);
      const y = this.top + (i / (this.n - 1 + this.hold)) * this.range + 2;
      scrollToY(y, { dur: clamp(Math.abs(y - window.scrollY) * 0.9, 600, 2200), easing: ease.inOutSine });
    }));

    // Keyboard / find-in-page focus moves the scroll to the frame that owns the element.
    el.addEventListener('focusin', (e) => {
      if (this.static) return;
      const slide = e.target.closest('.seq__slide, .seq__word-wrap');
      if (!slide) return;
      const i = Number(slide.dataset.i);
      if (i === this.active) return;
      const f = (i / (this.n - 1 + this.hold)) * this.range;
      window.scrollTo({ top: this.top + f, behavior: 'auto' });
    });
  }

  setStatic(on) {
    this.static = on;
    this.el.classList.toggle('is-static', on);
    if (on) {
      [...this.frames, ...this.slides, ...this.texts, ...this.bgs].forEach((n) => { n.style.cssText = ''; });
      if (this.edge) this.edge.style.cssText = '';
      this.frames.forEach((fr) => { fr.firstElementChild?.removeAttribute?.('style'); fr.querySelectorAll('i').forEach((n) => n.removeAttribute('style')); fr.querySelector('img')?.removeAttribute('style'); });
      if (this.mask) this.mask.style.cssText = '';
      this.focusables.flat().forEach((f) => f.removeAttribute('tabindex'));
    }
  }

  setFocus(active) {
    this.focusables.forEach((list, n) => list.forEach((f) => (Number(this.slides[n].dataset.i) === active ? f.removeAttribute('tabindex') : f.setAttribute('tabindex', '-1'))));
  }

  /**
   * Hero media: transform-only layered masking.
   *  - every photo drifts against the scroll (parallax) and breathes in scale while it is current
   *  - the incoming photo is revealed by a mask panel that slides up over the old one (the panel and
   *    its photo move in opposite directions, so the picture stays put while the mask travels)
   *  - the outgoing photo is pushed up and dims; a bright leading edge rides the mask
   */
  heroMedia(f, a, b, e, tr) {
    const vh = scroll.vh;
    this.frames.forEach((fr, i) => {
      const inner = fr.firstElementChild;
      const img = fr.querySelector('img');
      const incoming = i === b && b !== a;
      const outgoing = i === a && b !== a;
      const rel = f - i;                                   // -1 … +1 around this frame
      // Every frame stays painted and composited (no visibility toggling, which forced a re-raster and
      // image decode at the instant a transition began). Frames not yet reached simply wait off-stage.
      fr.style.zIndex = i + 1;
      const rise = i > b ? 1 : incoming ? (1 - e) : 0;
      fr.style.transform = `translate3d(0, ${(rise * 100).toFixed(2)}%, 0)`;
      inner.style.transform = `translate3d(0, ${(-rise * 100).toFixed(2)}%, 0)`;
      // Scale and drift are pure functions of the continuous scroll position `rel` (= f - i), never of the
      // frame's role, so a photo keeps exactly the same size/position when it changes from "incoming" to
      // "current". (The old role-based scale jumped 1.11 → 1.16 at that moment.)
      const r1 = clamp(rel, -1, 1);
      const scale = rel < 0 ? 1.1 + 0.06 * -r1 : 1.1 + 0.05 * r1;
      const drift = -r1 * vh * 0.07 + (incoming ? (1 - e) * vh * 0.06 : 0) + (outgoing ? -e * vh * 0.1 : 0);
      img.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      fr.style.filter = '';
      fr.style.opacity = outgoing ? (1 - 0.45 * e).toFixed(3) : '1';
    });
    if (this.edge) {
      const on = b !== a && tr > 0.001 && tr < 0.999;
      this.edge.style.opacity = on ? '1' : '0';
      this.edge.style.transform = `translate3d(0, ${((1 - e) * vh).toFixed(1)}px, 0)`;
    }
  }

  /**
   * Stage media (full-screen, tinted): the incoming photo slides in as a mask panel while its photo moves the
   * opposite way (so the picture holds still and only the mask travels). A solid band of the incoming tint rides
   * the leading edge, then dissolves into the photo's tint. Transform and opacity only.
   */
  stageMedia(f, a, b, e, tr) {
    const vw = scroll.vw;
    this.frames.forEach((fr, i) => {
      const inner = fr.firstElementChild;
      const img = fr.querySelector('img');
      const incoming = i === b && b !== a;
      const outgoing = i === a && b !== a;
      const rel = f - i;
      const r1 = clamp(rel, -1, 1);
      fr.style.zIndex = i + 1;
      const slide = i > b ? 1 : incoming ? 1 - e : 0;
      fr.style.transform = `translate3d(${(slide * 100).toFixed(2)}%, 0, 0)`;
      inner.style.transform = `translate3d(${(-slide * 100).toFixed(2)}%, 0, 0)`;
      const scale = rel < 0 ? 1.08 + 0.05 * -r1 : 1.08 + 0.04 * r1;
      const drift = -r1 * vw * 0.03 + (outgoing ? e * vw * 0.04 : 0);
      img.style.transform = `translate3d(${drift.toFixed(1)}px, 0, 0) scale(${scale.toFixed(4)})`;
      const lead = fr.querySelector('.seq__lead');
      if (lead) lead.style.opacity = incoming ? (Math.sin(Math.PI * clamp(e)) * 1).toFixed(3) : '0';
      const tint = fr.querySelector('.seq__tint');
      if (tint) tint.style.opacity = incoming ? (0.55 + 0.45 * (1 - e)).toFixed(3) : '';
      fr.style.opacity = outgoing ? (1 - 0.3 * e).toFixed(3) : '1';
    });
  }


  /**
   * "Values": everything is scrubbed continuously by the scroll position (no snapping between frames).
   * Each word drifts slowly across the screen the whole time it is current, its letters rise in / lift out in
   * a stagger, the paragraph arrives a beat after the word, the background tone melts across a wide band,
   * and a soft glow plus a hairline show overall progress.
   */
  words(p, s) {
    const n = this.n, f = p * (n - 1);
    const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
    const vw = s.vw;
    this.slides.forEach((sl) => {
      const i = Number(sl.dataset.i), d = f - i;
      const tin = sm((d + 0.45) / 0.33), tout = sm((d - 0.12) / 0.3);
      const vis = tin * (1 - tout);
      sl.style.setProperty('--in', tin.toFixed(3));
      sl.style.setProperty('--out', tout.toFixed(3));
      sl.style.transform = `translate3d(${(-d * vw * 0.055).toFixed(1)}px, 0, 0)`;
      sl.style.opacity = '1';
      sl.style.visibility = vis > 0.003 ? 'visible' : 'hidden';
    });
    this.texts.forEach((t, i) => {
      const d = f - i;
      const tin = sm((d + 0.2) / 0.2), tout = sm((d - 0.1) / 0.2);
      t.style.setProperty('--in', tin.toFixed(3));
      t.style.setProperty('--out', tout.toFixed(3));
      t.style.opacity = '1';
      t.style.visibility = tin * (1 - tout) > 0.003 ? 'visible' : 'hidden';
    });
    const a = Math.min(Math.floor(f), n - 1), fr = f - a;
    const mix = a === n - 1 ? 0 : sm((fr - 0.35) / 0.4);
    this.bgs.forEach((bg, i) => {
      bg.style.opacity = i === a ? '1' : i === a + 1 ? mix.toFixed(3) : '0';
      bg.style.zIndex = i === a + 1 ? 2 : i === a ? 1 : 0;
    });
    if (this.glow) this.glow.style.transform = `translate3d(${((p - 0.5) * vw * 0.9).toFixed(1)}px, ${(Math.sin(f * Math.PI) * -6).toFixed(1)}vh, 0)`;
    if (this.prog) this.prog.style.transform = `scaleX(${p.toFixed(4)})`;
    const cur = Math.round(f);
    if (cur !== this.active) {
      this.active = cur;
      this.ticks.forEach((t, i) => t.classList.toggle('is-active', i === cur));
      this.setFocus(cur);
    }
  }

  update(s) {
    if (this.static) return;
    const p = clamp((s.y - this.top) / this.range);
    if (s.y < this.top - s.vh * 1.1 || s.y > this.top + this.range + s.vh * 1.1) return;

    if (this.variant === 'words') { this.words(p, s); return; }
    const f = Math.min(p * (this.n - 1 + HOLD), this.n - 1);
    const a = Math.min(Math.floor(f), this.n - 1);
    const b = Math.min(a + 1, this.n - 1);
    const frac = f - a;
    const tr = a === b ? 0 : clamp((frac - HOLD) / (1 - HOLD));
    const e = ease.inOutCubic(tr);

    if (this.variant === 'hero') this.heroMedia(f, a, b, e, tr);
    else if (this.variant === 'stage') this.stageMedia(f, a, b, e, tr);
    else {
    // media: frame `a` stays underneath, frame `b` fades in over it with a gentle settle
    this.frames.forEach((fr, i) => {
      const incoming = i === b && b !== a;
      fr.style.visibility = i === a || i === b ? 'visible' : 'hidden';
      fr.style.zIndex = i === b ? 2 : 1;
      fr.style.opacity = incoming ? e.toFixed(3) : '1';
      const img = fr.querySelector('img');
      if (img) {
        const scale = incoming ? 1.06 - 0.06 * e : i === a && b !== a ? 1 + 0.03 * e : 1;
        img.style.transform = `scale(${scale.toFixed(4)})`;
      }
    });
    }

    // copy
    this.slides.forEach((sl) => {
      const i = Number(sl.dataset.i);                        // titles and bodies share indices
      let vis = 0;
      if (i === a) { vis = 1 - ease.outCubic(clamp(tr / 0.55)); }
      if (i === b && b !== a) { vis = ease.outCubic(clamp((tr - 0.25) / 0.75)); }
      if (a === b && i === a) vis = 1;
      const y = i === b && b !== a ? (1 - vis) * 44 : i === a && b !== a ? -tr * 60 : 0;
      let yy = y;
      if (this.variant === 'stage' && sl.classList.contains('seq__body')) {
        // body copy fades on as the reader scrolls through the frame (after the title has arrived)
        const q = p * (this.n - 1 + HOLD) - a;
        const rv = i === a ? ease.outCubic(clamp(q / (HOLD * 0.55))) : 0;
        vis *= rv; yy = y + (1 - rv) * 36;
      }
      if (this.variant === 'words') sl.style.setProperty('--v', vis.toFixed(3));
      sl.style.opacity = vis.toFixed(3);
      sl.style.transform = `translate3d(0, ${yy.toFixed(1)}px, 0)`;
      sl.style.pointerEvents = vis > 0.6 ? 'auto' : 'none';
      sl.style.visibility = vis > 0.01 ? 'visible' : 'hidden';
    });
    this.texts.forEach((t, i) => {
      const vis = i === a ? 1 - clamp(tr / 0.6) : i === b ? clamp((tr - 0.3) / 0.7) : 0;
      t.style.setProperty('--v', vis.toFixed(3));
      t.style.opacity = vis.toFixed(3);
      t.style.transform = `translate3d(0, ${((i === b ? 1 - vis : i === a ? -(1 - vis) : 0) * 30).toFixed(1)}px, 0)`;
    });
    this.bgs.forEach((bg, i) => {
      bg.style.opacity = i === a ? '1' : i === b ? e.toFixed(3) : '0';
      bg.style.zIndex = i === b ? 2 : i === a ? 1 : 0;
    });

    // colour mask: sweeps left→right through each frame's reading time, then fades into the next frame
    if (this.mask) {
      const q = p * (this.n - 1 + HOLD) - a;                 // progress through this frame's segment
      const m = clamp(q / HOLD);
      const fade = a === b ? 1 : 1 - e;
      const w = this.sticky.clientWidth;
      this.mask.dataset.k = String(a % 3);
      this.mask.style.opacity = fade.toFixed(3);
      this.mask.firstElementChild.style.transform = `scaleX(${m.toFixed(4)})`;
      this.mask.lastElementChild.style.transform = `translate3d(${(m * w).toFixed(1)}px, 0, 0)`;
    }

    // HUD
    const cur = tr > 0.5 ? b : a;
    if (cur !== this.active) {
      this.active = cur;
      if (this.counter) this.counter.textContent = String(cur + 1).padStart(2, '0');
      this.ticks.forEach((t, i) => t.classList.toggle('is-active', i === cur));
      this.setFocus(cur);
    }
    this.ticks.forEach((t, i) => t.style.setProperty('--p', i === a ? (1 - tr).toFixed(3) : i === b ? tr.toFixed(3) : i < a ? 1 : 0));
  }
}
