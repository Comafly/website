/** Tiny DOM helpers: query shortcuts and a hyperscript-style element builder. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let uidCount = 0;
/** Generates a document-unique id (the old site repeated ids, which breaks aria-controls). */
export const uid = (prefix = 'id') => `${prefix}-${++uidCount}`;

const NS_SVG = 'http://www.w3.org/2000/svg';

/**
 * h('div.card#x', { class: 'extra', data: { a: 1 }, aria: { label: 'x' }, onclick }, ...children)
 */
export function h(tag, attrs = {}, ...kids) {
  const m = /^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)$/.exec(tag);
  const el = document.createElement(m && m[1] ? m[1] : 'div');
  if (m && m[2]) {
    m[2].replace(/([.#])([\w-]+)/g, (_, k, v) => { if (k === '#') el.id = v; else el.classList.add(v); return ''; });
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = [el.className, v].filter(Boolean).join(' ');
    else if (k === 'data') for (const [dk, dv] of Object.entries(v)) { if (dv != null && dv !== false) el.dataset[dk] = dv === true ? '' : dv; }
    else if (k === 'aria') for (const [ak, av] of Object.entries(v)) { if (av != null) el.setAttribute(`aria-${ak}`, av); }
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, sv);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const k of [].concat(kids)) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

export function svg(markup, cls = '') {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  const el = t.content.firstElementChild;
  if (cls) el.setAttribute('class', cls);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('focusable', 'false');
  return el;
}

export const frag = (...kids) => append(document.createDocumentFragment(), kids);
export { NS_SVG };

/** Debounce to next animation frame. */
export function rafOnce(fn) {
  let queued = false;
  return (...a) => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fn(...a); }); };
}
