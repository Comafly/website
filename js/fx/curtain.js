import { config } from '../config.js';
import { motion } from '../core/motion.js';
import { ready } from '../core/ready.js';

/**
 * Layered page transition. Five panels cover the page; on load they peel away (staggered),
 * and when an internal link is clicked they sweep back in before navigating.
 */
export function initCurtain() {
  const el = document.querySelector('.curtain');
  if (!el) return;
  ready.then(() => { requestAnimationFrame(() => { el.dataset.state = 'open'; }); });

  if (!config.effects.pageCurtain) return;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html?$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname) return; // same page: anchors module handles it
    if (motion.reduced) return;
    e.preventDefault();
    el.dataset.state = 'closing';
    setTimeout(() => { location.href = url.href; }, 720);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) el.dataset.state = 'open'; });
}
