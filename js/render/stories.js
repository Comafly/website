import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { content } from '../core/content.js';
import { paras, plain } from '../core/rich.js';
import { photo, sectionHead, actionRow } from './parts.js';
import { shell, sectionId } from './shell-helpers.js';

/**
 * Stories carousel: a scroll-snapping row of image cards (headline + byline).
 * Each card is a button that opens a native <dialog> holding the full article.
 */
export function stories(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h2' });
  const root = shell(s, `stories tone-${s.tone || 'paper'}`, titleId, { data: { stories: true } });
  const ui = s.ui || {};
  const base = sectionId(s);

  const cards = s.items.map((it, i) => h('li.story', { role: 'group', 'aria-roledescription': 'slide', 'aria-label': (ui.position || '{n}/{total}').replace('{n}', i + 1).replace('{total}', s.items.length), data: { storyCard: true } },
    h('button.story__btn', { type: 'button', 'aria-haspopup': 'dialog', data: { open: `${base}-story-${i}` } },
      h('span.story__media', {}, photo(it.media, { sizes: '(min-width: 64em) 30vw, 80vw', parallax: false })),
      h('span.story__body', {},
        it.eyebrow && h('span.eyebrow', {}, it.eyebrow),
        h('span.story__title.t-h3', {}, plain(it.title)),
        h('span.story__byline', {}, it.byline),
        h('span.story__more', {}, ui.read || 'Read', icon('arrowRight', 'icon'))))));

  const controls = h('div.stories__controls', {},
    h('p.stories__count', { role: 'status', 'aria-live': 'polite', data: { storiesCount: true } }, ''),
    h('div.stories__arrows', {},
      h('button.icon-btn.stories__arrow', { type: 'button', 'aria-label': ui.prev || 'Previous', data: { storiesPrev: true } }, icon('arrowLeft')),
      h('button.icon-btn.stories__arrow', { type: 'button', 'aria-label': ui.next || 'Next', data: { storiesNext: true } }, icon('arrowRight'))),
    actionRow(s.actions, 'stories__actions'));

  const track = h('ul.stories__track', { role: 'list', tabindex: '-1', data: { storiesTrack: true } }, cards);
  const dialogs = s.items.map((it, i) => storyDialog(it, `${base}-story-${i}`));

  root.append(h('div.container.stories__head', {}, head, controls), track, ...dialogs);
  return root;
}

/** The article dialog shared by the news carousel and any card with an `article`. */
export function storyDialog(it, id) {
  const tid = `${id}-title`;
  return h('dialog.dialog.dialog--story.tone-paper', { id, 'aria-labelledby': tid, data: { dialog: id } },
    h('article.dialog__inner.story-article', {},
      h('button.dialog__close.icon-btn', { type: 'button', 'aria-label': content.site.dialogs.close, data: { close: true } }, icon('close')),
      h('div.story-article__media', {}, photo(it.media, { sizes: '46rem', parallax: false })),
      it.eyebrow && h('p.eyebrow', {}, it.eyebrow),
      h('h2.t-h2', { id: tid }, plain(it.title)),
      it.byline && h('p.story-article__byline', {}, it.byline),
      h('div.story-article__text', {}, paras(it.article).map((html) => h('p', { html })))));
}
