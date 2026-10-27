import { h } from '../core/dom.js';
import { richInline, paras } from '../core/rich.js';
import { sectionHead, actionRow } from './parts.js';
import { shell } from './shell-helpers.js';

/**
 * Title on the left; the copy on the right is uncovered by angled paint strokes that sweep left → right,
 * one under the other, as the section scrolls into view (see fx/paint.js). Without motion the text is simply shown.
 */
export function paintreveal(s) {
  const { el: head, titleId } = sectionHead({ ...s, lead: null }, { titleClass: s.titleClass || 't-h1' });
  const root = shell(s, `paint tone-${s.tone || 'ink'}`, titleId, { data: { paint: true } });
  root.append(h('div.paint__sticky', {}, h('div.container.paint__grid', {},
    h('div.paint__title', {}, head),
    // the red "paint" is this box's background, laid on by the brush mask; the white copy shows only where it has been painted
    h('div.paint__copy', {},
      s.lead && h('p.paint__lead', { html: richInline(s.lead) }),
      s.body && h('div.prose', {}, paras(s.body).map((html) => h('p', { html }))),
      actionRow(s.actions)))));
  return root;
}
