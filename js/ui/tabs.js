import { measureAll } from '../core/ticker.js';
import { motion } from '../core/motion.js';
import { scrollToY, targetY } from '../fx/anchors.js';

/**
 * ARIA tabs. Panels are deep-linkable by id (#panel-id opens the right tab, even when nested),
 * hidden panels use hidden="until-found" so Ctrl+F still finds text in them, and the arrow/Home/End
 * keys move between tabs.
 */
export function activateTab(tab, { focus = false, hash = false, enter = false } = {}) {
  const list = tab.closest('[role="tablist"]');
  if (!list) return;
  list.querySelectorAll('[role="tab"]').forEach((t) => {
    const sel = t === tab;
    t.setAttribute('aria-selected', String(sel));
    t.tabIndex = sel ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (!panel) return;
    if (sel) {
      panel.removeAttribute('hidden');
      if (enter && !motion.reduced) { panel.classList.remove('is-entering'); void panel.offsetWidth; panel.classList.add('is-entering'); }
    } else { panel.setAttribute('hidden', 'until-found'); panel.classList.remove('is-entering'); }
  });
  if (focus) tab.focus();
  if (hash) history.replaceState(null, '', `#${tab.getAttribute('aria-controls')}`);
  requestAnimationFrame(measureAll);
}

export function initTabs(root = document) {
  root.querySelectorAll('[data-tabs]').forEach((box) => {
    const list = box.querySelector(':scope > [role="tablist"]');
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', async () => {
        if (tab.getAttribute('aria-selected') === 'true') return;
        // side tabs: first return to the top of the option buttons, then swap the details in with a fade
        const section = box.classList.contains('tabs--side') ? box : null;   // scroll target: the top of the option buttons
        if (section) {
          const y = targetY(section);
          if (window.scrollY > y + 8) {
            list.querySelectorAll('[role="tab"]').forEach((t) => { const s = t === tab; t.setAttribute('aria-selected', String(s)); t.tabIndex = s ? 0 : -1; });
            await scrollToY(y, { dur: 650 });
          }
          activateTab(tab, { hash: true, enter: true });
          return;
        }
        activateTab(tab, { hash: true });
      });
      tab.addEventListener('keydown', (e) => {
        const k = e.key;
        let n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') n = 0;
        else if (k === 'End') n = tabs.length - 1;
        if (n == null) return;
        e.preventDefault();
        activateTab(tabs[n], { focus: true, hash: true });
      });
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel?.addEventListener('beforematch', () => activateTab(tab));
    });
  });
}
