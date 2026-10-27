import { $, $$ } from '../core/dom.js';

/** Accessible validation for the contact and login forms: inline errors, aria-invalid, focus first problem. */
function showErrors(form) {
  let first = null;
  $$('input, textarea, select', form).forEach((f) => {
    const err = f.closest('.field')?.querySelector('.field__error');
    if (f.checkValidity()) { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); if (err) err.textContent = ''; return; }
    f.setAttribute('aria-invalid', 'true');
    if (err) {
      if (!err.id) err.id = `${f.id}-err`;
      err.textContent = f.validationMessage;
      f.setAttribute('aria-describedby', err.id);
    }
    first = first || f;
  });
  return first;
}

export function initForms(root = document) {
  $$('form[data-contact-form], form[data-login-form]', root).forEach((form) => {
    const status = $('[data-form-status]', form);
    form.addEventListener('input', (e) => {
      const f = e.target;
      if (f.getAttribute?.('aria-invalid') && f.checkValidity()) { f.removeAttribute('aria-invalid'); const err = f.closest('.field')?.querySelector('.field__error'); if (err) err.textContent = ''; }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bad = showErrors(form);
      if (bad) { status.textContent = form.dataset.errorSummary || ''; bad.focus(); return; }
      status.textContent = '';
      if (form.dataset.endpoint) {
        try {
          const res = await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
          if (!res.ok) throw new Error(res.status);
        } catch { status.textContent = form.dataset.errorSummary || 'Something went wrong.'; return; }
      }
      status.textContent = form.dataset.success || form.dataset.demo || '';
      status.classList.add('is-success');
      status.focus?.();
      form.reset();
    });
  });
}
