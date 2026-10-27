import { config } from '../config.js';
import { motion, clamp } from './motion.js';

/**
 * One requestAnimationFrame loop for the whole page.
 *
 * `scroll.y`  – real scroll position
 * `scroll.sy` – eased (smoothed) scroll position. Every scrubbed effect reads this so
 *               motion always glides instead of snapping to the wheel.
 * `scroll.vel`– smoothed velocity in px/s (signed)
 * `scroll.dir`– last non-zero direction (1 down, -1 up)
 */
export const scroll = { y: 0, sy: 0, vel: 0, dir: 1, vh: innerHeight, vw: innerWidth, max: 1, dt: 0.016, time: 0 };

const frameFns = new Set();
const measureFns = [new Set(), new Set()]; // phase 0 sets sizes, phase 1 reads positions
let last = 0;
let prevSy = 0;

export const onFrame = (fn) => { frameFns.add(fn); return () => frameFns.delete(fn); };
export const onMeasure = (fn, phase = 1) => { measureFns[phase].add(fn); return () => measureFns[phase].delete(fn); };

export function measureAll() {
  scroll.vh = window.innerHeight;
  scroll.vw = window.innerWidth;
  measureFns[0].forEach((fn) => fn(scroll));
  scroll.max = Math.max(1, document.documentElement.scrollHeight - scroll.vh);
  measureFns[1].forEach((fn) => fn(scroll));
}

/** Absolute document offset of an element (ignores sticky/transform children). */
export function pageTop(el) {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
  return y;
}

function frame(t) {
  const dt = Math.min((t - last) / 1000 || 0.016, 0.05);
  last = t;
  scroll.dt = dt;
  scroll.time = t;
  const y = window.scrollY;
  if (y !== scroll.y) scroll.dir = y > scroll.y ? 1 : -1;
  scroll.y = y;
  if (motion.reduced) scroll.sy = y;
  else {
    scroll.sy += (y - scroll.sy) * (1 - Math.exp(-config.scroll.smoothing * dt));
    if (Math.abs(y - scroll.sy) < 0.1) scroll.sy = y;
  }
  const v = (scroll.sy - prevSy) / dt;
  scroll.vel += (v - scroll.vel) * clamp(dt * 9);
  prevSy = scroll.sy;
  frameFns.forEach((fn) => fn(scroll, t));
  requestAnimationFrame(frame);
}

export function startTicker() {
  scroll.y = scroll.sy = prevSy = window.scrollY;
  let rafMeasure = 0;
  const queue = () => { cancelAnimationFrame(rafMeasure); rafMeasure = requestAnimationFrame(measureAll); };
  addEventListener('resize', queue);
  addEventListener('load', queue);
  document.fonts?.ready.then(queue);
  new ResizeObserver(queue).observe(document.body);
  measureAll();
  requestAnimationFrame(frame);
  return queue;
}
