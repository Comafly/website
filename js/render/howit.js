import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { paras, plain } from '../core/rich.js';
import { photo, sectionHead } from './parts.js';
import { shell } from './shell-helpers.js';

/**
 * How it works: an introduction, the two tools students learn with (Moodle and Webex, each with a small
 * illustrated mock-up), then the two settings students join from. All wording comes from the section's JSON.
 * The mock-ups are decorative (aria-hidden); the same information is in the text beside them.
 */
const dots = () => h('span.mock__dots', {}, h('i'), h('i'), h('i'));

function moodleMock(rows = 4) {
  return h('div.mock.mock--moodle', { aria: { hidden: 'true' } },
    h('div.mock__bar', {}, dots(), h('span.mock__url')),
    h('div.mock__body', {},
      Array.from({ length: rows }, (_, i) => h('div', { class: `mock__row${i < rows - 1 ? ' is-done' : ''}`, style: { '--i': i } },
        h('span.mock__tick', {}, icon('check')), h('span.mock__line'), h('span.mock__line.is-short'))),
      h('div.mock__progress', {}, h('i'))));
}

function webexMock() {
  const names = ['A', 'J', 'T', 'R', 'C', 'M'];
  return h('div.mock.mock--webex', { aria: { hidden: 'true' } },
    h('div.mock__bar', {}, dots(), h('span.mock__live', {}, 'Live')),
    h('div.mock__tiles', {}, names.map((n, i) => h('span', { class: `mock__tile${i === 1 ? ' is-speaking' : ''}`, style: { '--i': i } }, h('b', {}, n)))),
    h('div.mock__controls', {}, h('i'), h('i'), h('i.is-end')));
}

function personMock() {
  return h('div.mock.mock--person', { aria: { hidden: 'true' } },
    h('div.mock__faces', {}, ['A', 'J', 'T'].map((n) => h('b', {}, n))),
    h('span.mock__pin', {}, icon('pin'), 'Visit'));
}

export function howit(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-display' });
  const root = shell(s, 'howit tone-ink', titleId);

  // ── tools: three cards that stack as you scroll (fx/hstage.js, kind "tools") ──
  const toolCard = (t, i) => h('li', { class: `tool tool--${t.mock}`, style: { '--i': i } },
    t.mock === 'webex' ? webexMock() : t.mock === 'person' ? personMock() : moodleMock(),
    h('div.tool__copy', {},
      h('p.tool__kicker', {}, t.kicker),
      h('h3.tool__name', {}, t.name),
      h('p.tool__text', {}, t.body),
      h('ul.tool__points', { role: 'list' }, t.points.map((p) => h('li', {}, icon('check'), h('span', {}, p))))));
  const tools = h('div.hstage.hstage--tools', { data: { hstage: 'tools' } },
    h('div.hstage__sticky', {}, h('div.container.hstage__inner', {}, h('div.howit__intro', {}, head), h('ul.hstack', { role: 'list' }, s.tools.map(toolCard)))));

  // ── ways: the first copy slides left and becomes the second as the second photograph arrives (kind "ways") ──
  const [w1, w2] = s.ways;
  const copy = (w, cls) => h('div', { class: `way__copy ${cls}` },
    h('p.way__num', { aria: { hidden: 'true' } }, w.eyebrow),
    h('h4.way__title', {}, plain(w.title)),
    paras(w.body).map((html) => h('p.way__text', { html })));
  const fig = (w, cls) => h('figure', { class: `way__media ${cls}` }, photo(w.media, { sizes: '(min-width: 64em) 50vw, 100vw' }), h('span.way__tag', {}, w.tag));
  const ways = h('div.hstage.hstage--ways', { data: { hstage: 'ways' } },
    h('div.hstage__sticky', {}, h('div.container.wayset', {},
      fig(w1, 'way__media--a'),
      h('div.wayset__texts', {}, copy(w1, 'way__copy--a'), copy(w2, 'way__copy--b')),
      fig(w2, 'way__media--b'))));

  root.append(tools,
  h('div.container.howit__ways-head', {}, s.waysEyebrow && h('p.eyebrow', {}, s.waysEyebrow), h('h3.howit__ways-title', {}, plain(s.waysTitle))),
  ways);
  return root;
}
