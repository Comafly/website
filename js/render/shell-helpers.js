import { h } from '../core/dom.js';

/** Stable DOM id for a section: its legacy anchor if it has one, else its content id made selector-safe. */
export const sectionId = (s) => s.anchor || String(s.id).replace(/[^\w-]+/g, '-');

/**
 * Standard section wrapper. A <section> is only used when it has an accessible name
 * (heading or label), otherwise a <div>, so screen-reader landmark lists stay clean.
 */
export function shell(s, cls, titleId, extra = {}) {
  const named = Boolean(titleId || s.label);
  return h(named ? 'section' : 'div', {
    id: sectionId(s),
    class: ['section', cls, s.tone ? `tone-${s.tone}` : '', s.class || ''].filter(Boolean).join(' '),
    'aria-labelledby': titleId || null,
    'aria-label': !titleId && s.label ? s.label : null,
    data: { section: s.id, ...(extra.data || {}) },
  });
}
