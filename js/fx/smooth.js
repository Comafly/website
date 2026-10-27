import { clamp, motion } from '../core/motion.js';

/**
 * EASED SCROLLING
 * Wheel and keyboard scrolling drive a critically-damped spring toward a target position, so the page
 * eases *into* motion (no abrupt start) and eases *out* to a rest (no hard stop). Touch devices keep their
 * native momentum. Anchor jumps and the scroll cue use their own eased animation (fx/anchors.js).
 */
const SMOOTH_TIME = 0.5;   // seconds the spring takes to settle; larger = floatier
const WHEEL_GAIN = 1;
const MAX_STEP = 420;       // cap a single wheel event so one flick can't launch the page

function smoothDamp(cur, target, vel, st, dt) {
  const om = 2 / st, x = om * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const ch = cur - target;
  const tmp = (vel + om * ch) * dt;
  return [target + (ch + tmp) * e, (vel - om * tmp) * e];
}

const scrollableUnder = (el, dy) => {
  for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
      const atTop = n.scrollTop <= 0, atEnd = n.scrollTop + n.clientHeight >= n.scrollHeight - 1;
      if ((dy < 0 && !atTop) || (dy > 0 && !atEnd)) return true;
    }
  }
  return false;
};

export function initSmoothScroll() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  let pos = 0, target = 0, vel = 0, last = 0, running = false, set = 0;
  const max = () => document.documentElement.scrollHeight - window.innerHeight;

  const tick = (t) => {
    if (!running) return;
    // something else moved the page (scrollbar drag, anchor animation…): give control back
    if (Math.abs(window.scrollY - set) > 2) { running = false; return; }
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    [pos, vel] = smoothDamp(pos, target, vel, SMOOTH_TIME, dt);
    if (Math.abs(target - pos) < 0.25 && Math.abs(vel) < 2) { pos = target; running = false; }
    set = pos; window.scrollTo(0, pos);
    if (running) requestAnimationFrame(tick);
  };

  const push = (dy) => {
    if (!running) { pos = target = set = window.scrollY; vel = 0; last = performance.now(); running = true; requestAnimationFrame(tick); }
    target = clamp(target + dy, 0, max());
  };

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.defaultPrevented || motion.reduced) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (document.querySelector('dialog[open]') || scrollableUnder(e.target, e.deltaY)) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
    push(clamp(e.deltaY * unit * WHEEL_GAIN, -MAX_STEP, MAX_STEP));
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || motion.reduced) return;
    if (document.querySelector('dialog[open]')) return;
    const el = e.target;
    if (el && el !== document.body && el.closest('input, textarea, select, button, a, summary, [contenteditable], [role="tab"], [role="slider"]')) return;
    const H = window.innerHeight;
    const map = { ArrowDown: 80, ArrowUp: -80, PageDown: H * 0.9, PageUp: -H * 0.9, ' ': e.shiftKey ? -H * 0.9 : H * 0.9 };
    if (e.key in map) { e.preventDefault(); push(map[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); push(-1e7); }
    else if (e.key === 'End') { e.preventDefault(); push(1e7); }
  });
}
