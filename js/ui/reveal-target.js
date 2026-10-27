import { activateTab } from './tabs.js';

/** Make sure an element is actually visible: open parent <details> and select parent/own tab panels. */
export function revealTarget(el) {
  const panels = [];
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches('details')) n.open = true;
    if (n.matches('.tabs__panel, [data-cur-level]')) panels.unshift(n);
  }
  panels.forEach((p) => {
    const tab = document.querySelector(`[role="tab"][aria-controls="${p.id}"]`);
    if (!tab) return;
    if (p.matches('[data-cur-level]')) { if (tab.getAttribute('aria-selected') !== 'true') tab.click(); } else activateTab(tab);
  });
}
