import { config } from '../config.js';

/** Easing + math utilities and the single source of truth for "is motion allowed?". */

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const remap = (v, a, b, c = 0, d = 1) => c + ((v - a) / (b - a)) * (d - c);
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set();
let userPref = null; // 'reduced' | 'full' | null

try { userPref = localStorage.getItem(config.storageKey); } catch { /* storage unavailable */ }

export const motion = {
  get reduced() { return userPref ? userPref === 'reduced' : mq.matches; },
  get userPref() { return userPref; },
  set(pref) {
    userPref = pref;
    try { pref ? localStorage.setItem(config.storageKey, pref) : localStorage.removeItem(config.storageKey); } catch { /* ignore */ }
    apply();
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

function apply() {
  document.documentElement.dataset.motion = motion.reduced ? 'reduced' : 'full';
  listeners.forEach((fn) => fn(motion.reduced));
}
mq.addEventListener?.('change', apply);
apply();
