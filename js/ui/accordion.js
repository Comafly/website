import { measureAll } from '../core/ticker.js';

/** Expand/collapse-all controls, and re-measure pinned sections after panels animate open/closed. */
export function initAccordions(root = document) {
  root.querySelectorAll('[data-acc-group]').forEach((g) => {
    g.querySelectorAll('[data-acc-all]').forEach((btn) => btn.addEventListener('click', () => {
      const open = btn.dataset.accAll === 'open';
      g.querySelectorAll(':scope > details').forEach((d) => { d.open = open; });
    }));
  });
  root.querySelectorAll('details.acc').forEach((d) => d.addEventListener('toggle', () => {
    setTimeout(measureAll, 60);
    setTimeout(measureAll, 700);
  }));
}
