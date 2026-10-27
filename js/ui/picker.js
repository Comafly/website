import { h } from '../core/dom.js';
import { btn } from '../render/parts.js';
import { richInline } from '../core/rich.js';

/** Pathway picker: choose who you are, then why, and get a matching destination (results live in JSON). */
export function initPickers(root = document) {
  root.querySelectorAll('[data-picker]').forEach((box) => {
    const results = JSON.parse(box.dataset.results || '{}');
    const steps = [...box.querySelectorAll('[data-step]')];
    const out = box.querySelector('[data-picker-result]');
    const placeholder = out.innerHTML;

    box.addEventListener('change', (e) => {
      const input = e.target.closest('input[type="radio"]');
      if (!input) return;
      const step = input.closest('[data-step]').dataset.step;
      if (step === 'who') {
        steps.forEach((s) => { if (s.dataset.step !== 'who') { s.hidden = s.dataset.step !== input.value; s.querySelectorAll('input').forEach((i) => { i.checked = false; }); } });
        out.innerHTML = placeholder;
        out.classList.remove('is-filled');
        return;
      }
      const r = results[input.value];
      if (!r) return;
      out.classList.add('is-filled');
      out.replaceChildren(
        h('p.eyebrow', {}, r.eyebrow),
        h('h3.picker__result-title', {}, r.title),
        h('p.picker__result-text', { html: richInline(r.text) }),
        btn({ label: r.label, to: r.to, variant: 'solid' }));
    });
  });
}
