import { $, $$ } from '../core/dom.js';

/** Native <dialog> handling: focus trap, Esc, backdrop click, focus return all come from the platform. */
export function initDialogs() {
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      const d = $(`[data-dialog="${opener.dataset.open}"]`);
      if (!d) return;
      d.showModal();
      d.dispatchEvent(new CustomEvent('dialog:open'));
      requestAnimationFrame(() => (d.querySelector('input') || d.querySelector('button'))?.focus());
      return;
    }
    const closer = e.target.closest('[data-close]');
    if (closer) closer.closest('dialog')?.close();
    if (e.target instanceof HTMLDialogElement) e.target.close(); // backdrop
  });
  // <input type="search"> swallows the first Esc to clear itself; closing the dialog should win.
  $$('dialog').forEach((d) => d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && d.open) { e.preventDefault(); d.close(); } }));
  $$('dialog').forEach((d) => d.addEventListener('close', () => document.documentElement.classList.remove('dialog-open')));
  $$('dialog').forEach((d) => d.addEventListener('dialog:open', () => document.documentElement.classList.add('dialog-open')));
}
