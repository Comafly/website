import { content } from './content.js';

/**
 * Rich-text mini markup used throughout the JSON content (all input is HTML-escaped first):
 *
 *   [label](url)            link. http(s) links open in a new tab with an accessible hint.
 *                           "page-id#anchor" style targets are resolved to real URLs.
 *   **bold**                strong
 *   ==highlight==           <mark>
 *   {{nys|Kaya wanju}}      language span, e.g. Noongar
 *   blank line              new paragraph (see paras())
 *   single newline          <br>
 */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function linkAttrs(href) {
  const external = /^https?:\/\//i.test(href) && !href.startsWith(location.origin);
  return { external, attrs: external ? ' target="_blank" rel="noopener noreferrer"' : '' };
}

export function richInline(text) {
  let s = esc(text ?? '');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, raw) => {
    const href = content.href(raw.replace(/&amp;/g, '&'));
    const { external, attrs } = linkAttrs(href);
    const hint = external ? `<span class="u-visually-hidden"> ${esc(content.ui('newTab'))}</span>` : '';
    return `<a class="text-link" href="${esc(href)}"${attrs}>${label}${hint}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/==([^=]+)==/g, '<mark class="mark">$1</mark>');
  s = s.replace(/\{\{([a-z-]+)\|([^}]+)\}\}/g, '<span lang="$1">$2</span>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

/** Splits a string (or array of strings) into paragraph HTML strings. */
export function paras(text) {
  const list = Array.isArray(text) ? text : String(text ?? '').split(/\n{2,}/);
  return list.filter((p) => p && p.trim()).map((p) => richInline(p.trim()));
}

/** Strip markup to plain text (for aria-labels and retype). */
export function plain(text) {
  return String(text ?? '')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/\{\{[a-z-]+\|([^}]+)\}\}/g, '$1')
    .replace(/\n/g, ' ');
}
