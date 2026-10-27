import { h } from '../core/dom.js';
import { content } from '../core/content.js';
import { heroSequence, pageHero } from './hero.js';
import { sequence } from './sequence.js';
import { stories } from './stories.js';
import { spotlight } from './spotlight.js';
import { waMap } from './map.js';
import { calendar } from './calendar.js';
import { newsletter } from './newsletter.js';
import { howit } from './howit.js';
import { curriculum } from './curriculum.js';
import { paintreveal } from './paint.js';
import { statement, feature, banner, marquee, stats, cta, notice, prose, rowlist } from './layouts.js';
import { accordion, tabs, hscroll, docs, people, picker, contactForm } from './collections.js';
import { sectionId } from './shell-helpers.js';

/**
 * Section registry: JSON `type` → renderer. To add a new section layout, write a function that
 * takes the section's JSON and returns an element, then add it here.
 */
export const SECTION_TYPES = {
  'hero-sequence': heroSequence,
  rowlist,
  'page-hero': pageHero,
  sequence,
  statement,
  feature,
  banner,
  marquee,
  stats,
  cta,
  stories,
  spotlight,
  map: waMap,
  calendar,
  newsletter,
  howit,
  curriculum,
  paintreveal,
  notice,
  prose,
  accordion,
  tabs,
  hscroll,
  docs,
  people,
  picker,
  contact: contactForm,
};

export function renderSections(sections, main) {
  const rendered = [];
  sections.forEach((s) => {
    const fn = SECTION_TYPES[s.type];
    if (!fn) { console.warn(`[content] Unknown section type "${s.type}" in ${s.id}`); return; }
    const el = fn(s);
    main.append(el);
    rendered.push({ s, el });
  });

  // Point every "scroll" cue at the next section.
  main.querySelectorAll('.scroll-cue[data-next]').forEach((cue) => {
    const host = cue.closest('.section');
    const next = host?.nextElementSibling;
    if (next?.id) cue.setAttribute('href', `#${next.id}`);
  });
  return rendered;
}

/** Developer guard-rails: duplicate ids (a bug on the legacy site) and nav anchors without targets. */
export function auditDocument() {
  const seen = new Map();
  document.querySelectorAll('[id]').forEach((el) => seen.set(el.id, (seen.get(el.id) || 0) + 1));
  seen.forEach((n, id) => { if (n > 1) console.warn(`[audit] Duplicate id "${id}" ×${n}`); });
  const entry = content.site.nav.find((n) => n.page === content.pageMeta.id);
  entry?.anchors.forEach((a) => { if (!document.getElementById(a.anchor)) console.warn(`[audit] Nav anchor "#${a.anchor}" has no matching section on ${content.pageMeta.id}`); });
  const h1s = document.querySelectorAll('h1').length;
  if (h1s !== 1) console.warn(`[audit] Expected one <h1>, found ${h1s}`);
}
