import { h } from '../core/dom.js';
import { paras, plain } from '../core/rich.js';
import { actionRow } from './parts.js';
import { renderBlocks } from './blocks.js';
import { shell } from './shell-helpers.js';

/**
 * Full-screen pseudo-3D map scene. Everything visual is drawn on one canvas by fx/map.js; this renderer
 * supplies the copy, the data (clusters → generated markers) and an accessible text alternative.
 */
export function waMap(s) {
  const titleId = `${s.anchor || s.id.replace(/\W+/g, '-')}-title`;
  const total = s.clusters.reduce((n, c) => n + c.count, 0);
  const root = shell(s, `map tone-${s.tone || 'ink'}`, titleId, { data: { map: true, clusters: JSON.stringify(s.clusters), total: String(total) } });

  root.append(h('div.map__sticky', {},
    h('canvas.map__canvas', { role: 'img', 'aria-label': s.alt || '' }),
    h('div.map__shade', { aria: { hidden: 'true' } }),
    h('div.map__copy.container', {},
      s.eyebrow && h('p.eyebrow', {}, s.eyebrow),
      h('h2', { id: titleId, class: 'map__title' }, plain(s.title)),
      s.body && h('div.map__text', {}, paras(s.body).map((html) => h('p', { html }))),
      s.blocks && h('div.prose.map__blocks', {}, renderBlocks(s.blocks)),
      h('p.map__count', { aria: { hidden: 'true' } }, h('span.map__num', { data: { mapCount: true } }, '0'), h('span.map__unit', {}, s.counterLabel)),
      actionRow(s.actions)),
    // text alternative to the canvas
    h('ul.u-visually-hidden', {}, s.clusters.filter((c) => c.label).map((c) => h('li', {}, (s.listItem || '{region}: {count}').replace('{region}', c.label).replace('{count}', c.count))))));
  return root;
}
