import { h } from '../core/dom.js';
import { content } from '../core/content.js';
import { richInline, paras, plain } from '../core/rich.js';
import { photo, sectionHead, actionRow, heading } from './parts.js';
import { renderBlocks } from './blocks.js';
import { shell } from './shell-helpers.js';

/**
 * Pinned "scroll-through" sequences.
 *   variant "words": a giant word changes per frame while the background shifts tone (values).
 *   variant "split": image panels wipe over each other beside matching copy (how-it-works).
 */
export function sequence(s) {
  const frames = s.frames;
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h2', level: 2 });
  const variant = s.variant || 'words';
  const root = shell(s, `seq seq--${variant} tone-${s.tone || 'ink'}`, titleId, { data: { seq: variant, frames: frames.length } });
  root.style.setProperty('--frames', frames.length);

  const ticks = h('ol.seq__ticks', { aria: { label: `${s.title || 'Sequence'} steps` } }, frames.map((f, i) => h('li', { data: { tick: i } }, h('button', { type: 'button', aria: { label: `Go to ${plain(f.title || String(i + 1))}` }, data: { go: i } }, h('i'), h('span', {}, f.eyebrow || String(i + 1).padStart(2, '0'))))));

  let stage;
  if (variant === 'words') {
    stage = h('div.seq__stage.container', {},
      h('div.seq__lead', {}, head, s.statement && h('div.seq__vision', {}, s.statementLabel && h('p.seq__vision-label', {}, s.statementLabel), h('p.seq__statement.lead', { html: richInline(s.statement) }))),
      h('div.seq__words', {}, frames.map((f, i) => h('div.seq__word-wrap', { data: { i } },
        h('p.seq__count', {}, h('b', {}, String(i + 1).padStart(2, '0')), h('i'), h('span', {}, String(frames.length).padStart(2, '0'))),
        h('h3', { class: 'seq__word', lang: f.titleLang, aria: { label: plain(f.title) }, style: `--n:${[...plain(f.title)].length}` },
          [...plain(f.title)].map((c, ci) => h('span.seq__ch', { aria: { hidden: 'true' }, style: `--ci:${ci}` }, c)))))),
      h('div.seq__texts', {}, frames.map((f, i) => h('div.seq__text', { data: { i } }, h('i.seq__rule', { aria: { hidden: 'true' } }), h('div.seq__text-in', {}, paras(f.body).map((html) => h('p', { html })))))));
    root.append(
      h('div.seq__sticky', {},
        h('div.seq__bgs', { aria: { hidden: 'true' } }, frames.map((f, i) => h('div', { class: `seq__bg tone-${f.tone || 'ink'}`, data: { i } }))),
        h('i.seq__glow', { aria: { hidden: 'true' } }), h('i.seq__prog', { aria: { hidden: 'true' } }),
        stage, h('div.seq__hud.container', {}, ticks)));
  } else if (variant === 'stage') {
    // full-screen photographs, each under its own colour tint; the next one is masked in over the last
    const panels = h('div.seq__panels', {}, frames.map((f, i) => h('figure', { class: 'seq__panel', data: { i, k: i % 3 } },
      h('div.seq__panel-in', {}, photo(f.media, { sizes: '100vw', parallax: false, class: 'ph--full', eager: i === 0 }), h('i.seq__tint'), h('i.seq__lead')))));
    // number + title sit near the top (under the section heading); the body copy is centred and fades on separately
    const titles = h('div.seq__titles', {}, frames.map((f, i) => h('div.seq__slide.seq__head', { data: { i } },
      f.eyebrow && h('p.eyebrow', {}, f.eyebrow),
      h('h3', { class: 'seq__title t-display' }, plain(f.title)))));
    const bodies = h('div.seq__bodies', {}, frames.map((f, i) => h('div.seq__slide.seq__body', { data: { i } },
      paras(f.body).map((html) => h('p', { html })),
      actionRow(f.actions))));
    root.append(h('div.seq__sticky', {},
      panels, h('div.seq__scrim', { aria: { hidden: 'true' } }),
      h('div.seq__stagecopy.container', {}, h('div.seq__lead', {}, head), titles, bodies),
      h('div.seq__hud.container', {}, ticks)));
  } else {
    // split
    const media = h('div.seq__panels', {}, frames.map((f, i) => h('figure.seq__panel', { data: { i } }, photo(f.media, { sizes: '(min-width: 64em) 50vw, 100vw' }))));
    const copy = h('div.seq__slides', {}, frames.map((f, i) => h('div.seq__slide', { data: { i } },
      f.eyebrow && h('p.eyebrow', {}, f.eyebrow),
      h('h3', { class: 'seq__title t-h1' }, plain(f.title)),
      paras(f.body).map((html) => h('p', { html })),
      f.blocks && renderBlocks(f.blocks),
      actionRow(f.actions))));
    root.append(h('div.seq__sticky', {},
      h('div.seq__mask', { aria: { hidden: 'true' }, data: { seqMask: true } }, h('i.seq__mask-fill'), h('i.seq__mask-edge')),
      h('div.seq__stage.container', {}, h('div.seq__lead', {}, head), media, copy),
      h('div.seq__hud.container', {}, ticks)));
  }
  return root;
}
