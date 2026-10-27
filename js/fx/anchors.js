import { clamp, ease, motion } from '../core/motion.js';
import { pageTop, scroll, measureAll } from '../core/ticker.js';
import { revealTarget } from '../ui/reveal-target.js';

/** Eased in-page navigation that accounts for the (variable height) sticky header and moves focus. */
let anim = 0;

export function headerOffset() {
  const hd = document.getElementById('site-header');
  const compact = getComputedStyle(document.documentElement).getPropertyValue('--nav-h-compact');
  const px = parseFloat(compact) * parseFloat(getComputedStyle(document.documentElement).fontSize);
  return (Number.isFinite(px) ? px : hd?.offsetHeight || 64) + 12;
}

export function scrollToY(y, { instant = false, slow = 1, dur: fixed = 0, easing = ease.inOutQuart } = {}) {
  cancelAnimationFrame(anim);
  y = clamp(y, 0, document.documentElement.scrollHeight - innerHeight);
  if (instant || motion.reduced) { window.scrollTo(0, y); return Promise.resolve(); }
  const y0 = window.scrollY, dist = y - y0;
  const dur = fixed || clamp(520 + Math.abs(dist) * 0.32, 520, 1700) * slow;
  const t0 = performance.now();
  return new Promise((resolve) => {
    // any manual input (wheel, touch, keys) hands control straight back to the reader
    const stop = () => { cancelAnimationFrame(anim); cleanup(); resolve(); };
    const cleanup = () => ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => removeEventListener(ev, stop));
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => addEventListener(ev, stop, { passive: true }));
    const step = (t) => {
      const k = clamp((t - t0) / dur);
      window.scrollTo(0, y0 + dist * easing(k));
      if (k < 1) anim = requestAnimationFrame(step); else { cleanup(); resolve(); }
    };
    anim = requestAnimationFrame(step);
  });
}

export function targetY(el) {
  // Pinned wrappers (hscroll/sequence) start at the wrapper's top; everything else sits under the header.
  return pageTop(el) - (el.matches('.hs, .seq, .banner') ? 0 : headerOffset());
}

export async function goTo(hash, { instant = false, push = true } = {}) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) { await scrollToY(0, { instant }); return; }
  const el = document.getElementById(id);
  if (!el) return;
  revealTarget(el);       // opens tabs / accordions that contain the target
  measureAll();
  if (push) history.pushState(null, '', `#${id}`);
  await scrollToY(targetY(el), { instant });
  const focusEl = el.matches('section, div, details') ? el : el;
  if (!el.hasAttribute('tabindex') && !el.matches('a, button, input, summary, [role="tab"]')) el.setAttribute('tabindex', '-1');
  focusEl.focus({ preventScroll: true });
}

export function initAnchors() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    e.preventDefault();
    goTo(url.hash);
  });
  addEventListener('popstate', () => goTo(location.hash, { push: false }));
  document.querySelector('[data-to-top]')?.addEventListener('click', () => { scrollToY(0); history.replaceState(null, '', location.pathname); });
}
