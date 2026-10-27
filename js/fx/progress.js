import { onFrame, scroll } from '../core/ticker.js';

/** Thin page-progress line under the header. */
export function initProgress() {
  const bar = document.querySelector('[data-progress]');
  if (!bar) return;
  onFrame((s) => { bar.style.transform = `scaleX(${Math.min(1, s.sy / s.max).toFixed(4)})`; });
}
