import { h } from '../core/dom.js';
import { paras, plain } from '../core/rich.js';
import { photo, actionRow } from './parts.js';
import { shell } from './shell-helpers.js';

/**
 * Full-screen "stage" scene. One pinned photograph with scroll-linked masks:
 *   • red, green and blue copies of the photo wipe in from different edges (sliding mask panels)
 *   • they drift in separate parallax layers, then converge into the true-colour photograph
 *   • the headline rises word-by-word out of clipping masks
 */
export function spotlight(s) {
  const titleId = `${s.anchor || s.id.replace(/\W+/g, '-')}-title`;
  const root = shell(s, `spot tone-${s.tone || 'ink'}`, titleId, { data: { spot: true } });
  const words = plain(s.title).split(/\s+/);

  const channel = (c) => h(`div.spot__ch.spot__ch--${c}`, { data: { spotCh: c } },
    h('div.spot__ch-in', { data: { spotIn: true } }, photo(s.media, { sizes: '100vw', parallax: false, class: 'ph--full', eager: true })));

  root.append(h('div.spot__sticky', {},
    // three single-colour copies of one photograph, added together on black; they slide in as masks,
    // drift apart in parallax and finally register on top of each other as the full-colour image
    h('div.spot__stage', { aria: { hidden: 'true' } }, h('div.spot__glow', { data: { spotGlow: true } }), channel('r'), channel('g'), channel('b')),
    h('div.spot__vignette', { aria: { hidden: 'true' } }),
    h('div.spot__copy.container', { data: { spotCopy: true } },
      s.eyebrow && h('p.eyebrow', {}, s.eyebrow),
      h('h2', { id: titleId, class: 'spot__title t-display' },
        words.flatMap((w, i) => [h('span.spot__word', { style: { '--i': i } }, h('span', {}, w)), ' '])),
      h('div.spot__text', {}, paras(s.body).map((html) => h('p', { html }))),
      actionRow(s.actions))));
  return root;
}
