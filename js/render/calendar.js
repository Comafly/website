import { h, uid } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { content } from '../core/content.js';
import { motion } from '../core/motion.js';
import { shell } from './shell-helpers.js';

/**
 * Events & Calendar: one full-height section fed by an .ics file (content/calendar.ics).
 *   left  — every event, grouped by month, starting from the current month
 *   right — a calendar that toggles between a month grid and a whole-year overview
 *
 * Accessibility: the month is a real ARIA grid (one tab stop, arrow keys / Home / End / PageUp / PageDown),
 * each day's button carries its date and events in its label, the year overview is twelve labelled buttons,
 * view/month changes are announced through a polite live region, colour is never the only carrier of meaning,
 * and every animation is skipped for people who ask for reduced motion.
 */

/* ───────────────────────────── ICS parsing ───────────────────────────── */
const pad = (n) => String(n).padStart(2, '0');
const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;                       // m is 1-12
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return { y, m, d }; };
const toDate = (k) => { const { y, m, d } = parseKey(k); return new Date(y, m - 1, d); };
const fromDate = (dt) => key(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
const addDays = (k, n) => { const dt = toDate(k); dt.setDate(dt.getDate() + n); return fromDate(dt); };
const monthKey = (k) => k.slice(0, 7);                                      // "2027-03"
const unescapeText = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

export function parseICS(text) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur?.start) {
        const last = cur.end ? addDays(cur.end, cur.endExclusive ? -1 : 0) : cur.start;
        events.push({ uid: cur.uid, start: cur.start, end: last < cur.start ? cur.start : last, title: cur.title || '', cat: cur.cat || '', desc: cur.desc || '', url: cur.url || '' });
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';');
    const val = line.slice(i + 1);
    const isDate = (v) => /^\d{8}/.test(v);
    const asKey = (v) => key(+v.slice(0, 4), +v.slice(4, 6), +v.slice(6, 8));
    switch (name.toUpperCase()) {
      case 'UID': cur.uid = val; break;
      case 'SUMMARY': cur.title = unescapeText(val); break;
      case 'DESCRIPTION': cur.desc = unescapeText(val); break;
      case 'CATEGORIES': cur.cat = unescapeText(val.split(',')[0]); break;
      case 'URL': cur.url = val; break;
      case 'DTSTART': if (isDate(val)) cur.start = asKey(val); break;
      case 'DTEND': if (isDate(val)) { cur.end = asKey(val); cur.endExclusive = params.some((p) => /VALUE=DATE$/i.test(p)) || val.length === 8 || /T000000/.test(val); } break;
      default:
    }
  }
  return events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.title.localeCompare(b.title)));
}

/* ───────────────────────────── helpers ───────────────────────────── */
const LOCALE = 'en-AU';
const fmt = (opts) => new Intl.DateTimeFormat(LOCALE, opts);
const F = {
  monthYear: fmt({ month: 'long', year: 'numeric' }),
  month: fmt({ month: 'long' }),
  short: fmt({ weekday: 'short', day: 'numeric', month: 'short' }),
  shortYear: fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  dayMonth: fmt({ day: 'numeric', month: 'short' }),
  full: fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  weekdayLong: fmt({ weekday: 'long' }),
  weekdayShort: fmt({ weekday: 'short' }),
};
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const monthLabel = (ym) => F.monthYear.format(new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1));
const GROUPS = [
  [/public holiday/i, 'holiday'],
  [/school holiday/i, 'school'],
  [/first nations/i, 'first'],
  [/note/i, 'note'],
];
const groupOf = (cat) => (GROUPS.find(([re]) => re.test(cat)) || [0, 'aware'])[1];
const searchText = (e) => `${e.title} ${e.cat} ${e.desc} ${F.full.format(toDate(e.start))} ${F.monthYear.format(toDate(e.start))}`.toLowerCase();
const covers = (ev, k) => ev.start <= k && ev.end >= k;

/* ───────────────────────────── renderer ───────────────────────────── */
export function calendar(s) {
  const ui = s.ui || {};
  const head = s.eyebrow ? h('p.eyebrow.cal__eyebrow', {}, s.eyebrow) : null;
  const root = shell({ ...s, label: s.title || s.eyebrow }, `cal tone-${s.tone || 'ink'}`, null, { data: { calendar: true } });
  const listId = uid('cal-list'), viewsId = uid('cal-views'), titleCalId = uid('cal-title');

  const status = h('p.u-visually-hidden', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const list = h('div.cal__list', { role: 'region', tabindex: '0', id: listId, aria: { label: ui.listLabel || 'Events by month', busy: 'true' } },
    h('p.cal__msg', {}, ui.loading || 'Loading the calendar…'));

  const searchId = uid('cal-q');
  const input = h('input.cal__q', { type: 'search', id: searchId, autocomplete: 'off', spellcheck: 'false', placeholder: ui.searchPlaceholder || 'Search events', aria: { controls: listId } });
  const searchBox = h('div.cal__search', { role: 'search' },
    h('label.u-visually-hidden', { for: searchId }, ui.searchLabel || 'Search events'), icon('search'), input);
  const side = h('div.cal__side', {}, searchBox, list);

  const prev = h('button.cal__nav', { type: 'button' }, icon('arrowLeft'));
  const next = h('button.cal__nav', { type: 'button' }, icon('arrowRight'));
  const title = h('h3.cal__title', { id: titleCalId });
  const btnMonth = h('button.cal__seg', { type: 'button', aria: { pressed: 'true' }, data: { view: 'month' } }, ui.month || 'Month');
  const btnYear = h('button.cal__seg', { type: 'button', aria: { pressed: 'false' }, data: { view: 'year' } }, ui.year || 'Year');
  const toggle = h('div.cal__toggle', { role: 'group', aria: { label: ui.viewLabel || 'Calendar view' }, data: { view: 'month' } }, h('i.cal__thumb', { aria: { hidden: 'true' } }), btnMonth, btnYear);
  const bar = h('div.cal__bar', {}, h('div.cal__nav-wrap', {}, prev, next, title), toggle);
  const monthPane = h('div.cal__pane.cal__pane--month', { aria: { labelledby: titleCalId } });
  const yearPane = h('div.cal__pane.cal__pane--year', { hidden: true, aria: { labelledby: titleCalId } });
  const views = h('div.cal__views', { id: viewsId }, monthPane, yearPane);
  const legend = h('ul.cal__legend', { role: 'list', aria: { label: ui.legendLabel || 'Colour key' } },
    Object.entries(ui.groups || {}).map(([g, label]) => h('li', { data: { g } }, h('i', { aria: { hidden: 'true' } }), label)));
  const dl = h('a.cal__download', { href: s.src, download: '' }, icon('download'), ui.download || 'Download calendar (.ics)');
  const panel = h('div.cal__panel', {}, bar, views, h('div.cal__foot', {}, legend, dl));

  const dlgTitle = uid('cal-ev');
  const dlg = h('dialog.dialog.dialog--event.tone-ink', { 'aria-labelledby': dlgTitle },
    h('div.dialog__inner.cal-ev', {},
      h('button.dialog__close.icon-btn', { type: 'button', 'aria-label': content.site.dialogs.close, data: { close: true } }, icon('close')),
      h('p.cal-ev__cat'), h('h2.cal-ev__title.t-h2', { id: dlgTitle }), h('p.cal-ev__when'), h('p.cal-ev__desc'),
      h('div.cal-ev__also'), h('a.cal-ev__link', { target: '_blank', rel: 'noopener noreferrer' })));

  root.append(h('span#calendar-anchor', { tabindex: '-1' }),
    h('div.container.cal__wrap', {}, head, h('div.cal__body', {}, side, panel), status), dlg);

  load(s).then((events) => init(events), (err) => {
    console.warn('[calendar]', err);
    list.removeAttribute('aria-busy');
    list.replaceChildren(h('p.cal__msg', {}, ui.error || 'The calendar could not be loaded.', ' ', h('a', { href: s.src, download: '' }, ui.download || 'Download the .ics file')));
    panel.hidden = true; searchBox.hidden = true;
  });

  /* ───────────────── behaviour ───────────────── */
  function init(all) {
    const now = new Date();
    const todayKey = key(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const nowYM = monthKey(todayKey);

    // events still relevant, filed under their start month (or this month if they began earlier)
    const upcoming = all.filter((e) => e.end >= todayKey);
    const groups = new Map();
    upcoming.forEach((e) => {
      const ym = monthKey(e.start) < nowYM ? nowYM : monthKey(e.start);
      if (!groups.has(ym)) groups.set(ym, []);
      groups.get(ym).push(e);
    });
    const months = [...groups.keys()].sort();
    if (!months.length) { list.removeAttribute('aria-busy'); list.replaceChildren(h('p.cal__msg', {}, ui.empty || 'No upcoming events.')); panel.hidden = true; searchBox.hidden = true; return; }
    const minYM = months[0], maxYM = months[months.length - 1];

    const state = { q: '', view: 'month', ym: minYM, year: +minYM.slice(0, 4), sel: null, busy: false };
    const reduced = () => motion.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = 'cubic-bezier(0.22, 0.7, 0.2, 1)';
    const announce = (msg) => { status.textContent = ''; requestAnimationFrame(() => { status.textContent = msg; }); };
    const terms = () => state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (e) => { const q = searchText(e); return terms().every((t) => q.includes(t)); };
    const eventsOn = (k) => all.filter((e) => covers(e, k));
    const countIn = (ym) => all.filter((e) => e.start.slice(0, 7) <= ym && e.end.slice(0, 7) >= ym).length;
    const clampYM = (ym) => (ym < minYM ? minYM : ym > maxYM ? maxYM : ym);
    const shiftYM = (ym, n) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
    const countText = (n) => (n === 0 ? (ui.noEvents || 'No events') : fill(n === 1 ? (ui.oneEvent || '1 event') : (ui.nEvents || '{n} events'), { n }));

    /* ── the event list ── */
    const rangeText = (e) => {
      if (e.start === e.end) return [h('time', { datetime: e.start }, F.short.format(toDate(e.start)))];
      const sameYear = e.start.slice(0, 4) === e.end.slice(0, 4);
      return [h('time', { datetime: e.start }, (sameYear ? F.short : F.shortYear).format(toDate(e.start))),
        h('span.u-visually-hidden', {}, ` ${ui.to || 'to'} `), h('span.cal__dash', { aria: { hidden: 'true' } }, ' – '),
        h('time', { datetime: e.end }, (sameYear ? F.short : F.shortYear).format(toDate(e.end)))];
    };
    const frag = document.createDocumentFragment();
    months.forEach((ym) => {
      const hid = uid('cal-m');
      frag.append(h('section.cal__month', { aria: { labelledby: hid }, data: { ym } },
        h('h3.cal__month-title', { id: hid }, monthLabel(ym)),
        h('ol.cal__events', { role: 'list' }, groups.get(ym).map((e) => h('li.cal__event', { data: { g: groupOf(e.cat), start: e.start, end: e.end, uid: e.uid, q: searchText(e) } },
          h('p.cal__when', {}, rangeText(e)),
          h('div.cal__what', {},
            h('h4.cal__name', {}, h('button.cal__open', { type: 'button', 'aria-haspopup': 'dialog', data: { uid: e.uid } }, e.title)),
            e.cat && h('p.cal__cat', {}, h('span.u-visually-hidden', {}, `${ui.category || 'Category'}: `), e.cat)))))));
    });
    list.replaceChildren(frag);
    list.removeAttribute('aria-busy');

    const scrollListTo = (el) => {
      if (!el) return;
      const top = el.offsetTop - list.offsetTop;
      list.scrollTo({ top: Math.max(0, top - 4), behavior: reduced() ? 'auto' : 'smooth' });
    };
    const monthHeading = (ym) => list.querySelector(`.cal__month[data-ym="${ym}"]`);
    const flash = (els) => { els.forEach((el) => { el.classList.remove('is-hit'); void el.offsetWidth; el.classList.add('is-hit'); setTimeout(() => el.classList.remove('is-hit'), 1800); }); };

    /* ── month grid ── */
    const buildMonth = (ym) => {
      const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
      const first = new Date(y, m - 1, 1);
      const offset = (first.getDay() + 6) % 7;                              // Monday-first
      const dim = new Date(y, m, 0).getDate();
      const start = new Date(y, m - 1, 1 - offset);
      const focusKey = state.sel && monthKey(state.sel) === ym ? state.sel : (monthKey(todayKey) === ym ? todayKey : key(y, m, 1));
      const rows = [];
      for (let r = 0; r < 6; r++) {
        const cells = [];
        for (let c = 0; c < 7; c++) {
          const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + r * 7 + c);
          const k = fromDate(dt);
          if (monthKey(k) !== ym) { cells.push(h('td.cal__cell.is-out', { role: 'gridcell', aria: { hidden: 'true' } }, h('span.cal__num', {}, dt.getDate()))); continue; }
          const evs = eventsOn(k);
          const shown = evs.filter((e) => e.start === k || c === 0 || dt.getDate() === 1);
          const chips = shown.slice(0, 3).map((e) => h('span.cal__chip', { class: state.q && !hit(e) ? 'is-dim' : '', data: { g: groupOf(e.cat), uid: e.uid } }, e.title));
          const extra = shown.length - 3;
          const range = evs.find((e) => e.end > e.start);
          const label = `${F.full.format(dt)}. ${evs.length ? `${countText(evs.length)}: ${evs.map((e) => e.title).join('; ')}` : countText(0)}`;
          const btn = h('button.cal__day', { type: 'button', tabindex: k === focusKey ? '0' : '-1', 'aria-label': label, data: { k }, aria: { current: k === todayKey ? 'date' : null } },
            h('span.cal__num', { aria: { hidden: 'true' } }, dt.getDate()),
            h('span.cal__chips', { aria: { hidden: 'true' } }, chips, extra > 0 && h('span.cal__plus', {}, fill(ui.more || '+{n} more', { n: extra }))),
            evs.length > 0 && h('span.cal__dots', { aria: { hidden: 'true' } }, [...new Set(evs.map((e) => groupOf(e.cat)))].map((g) => h('i', { data: { g } }))));
          cells.push(h('td.cal__cell', { role: 'gridcell', data: { g: range ? groupOf(range.cat) : null }, class: [evs.length ? 'has-events' : '', range ? 'in-range' : '', k === todayKey ? 'is-today' : ''].join(' ').trim(), aria: { selected: k === state.sel ? 'true' : 'false' } }, btn));
        }
        rows.push(h('tr', { role: 'row' }, cells));
      }
      const heads = [1, 2, 3, 4, 5, 6, 0].map((wd) => { const dt = new Date(2024, 0, 7 + wd); return h('th', { scope: 'col', role: 'columnheader', abbr: F.weekdayLong.format(dt) }, F.weekdayShort.format(dt)); });
      return h('table.cal__grid', { role: 'grid', aria: { labelledby: titleCalId } }, h('thead', {}, h('tr', { role: 'row' }, heads)), h('tbody', {}, rows));
    };

    /* ── year overview ── */
    const buildMini = (y, m) => {
      const ym = `${y}-${pad(m)}`;
      const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
      const dim = new Date(y, m, 0).getDate();
      const days = [];
      for (let i = 0; i < 42; i++) {
        const d = i - offset + 1;
        if (d < 1 || d > dim) { days.push(h('i.cal__md.is-out')); continue; }
        const k = key(y, m, d), evs = eventsOn(k);
        days.push(h('i.cal__md', { class: [evs.length ? 'has-events' : '', k === todayKey ? 'is-today' : ''].join(' ').trim(), data: { g: evs.length ? groupOf((evs.find((e) => e.end > e.start) || evs[0]).cat) : null } }, d));
      }
      const disabled = ym < minYM || ym > maxYM;
      return h('button.cal__mini', { type: 'button', disabled, data: { ym }, 'aria-label': `${monthLabel(ym)}. ${countText(countIn(ym))}` },
        h('span.cal__mini-title', { aria: { hidden: 'true' } }, F.month.format(new Date(y, m - 1, 1))),
        h('span.cal__mini-grid', { aria: { hidden: 'true' } }, days),
        h('span.cal__mini-count', { aria: { hidden: 'true' } }, countText(countIn(ym))));
    };
    const buildYear = (y) => h('div.cal__year', {}, Array.from({ length: 12 }, (_, i) => buildMini(y, i + 1)));

    /* ── sync the chrome (title, nav buttons, toggle) ── */
    const syncChrome = () => {
      const isMonth = state.view === 'month';
      title.textContent = isMonth ? monthLabel(state.ym) : String(state.year);
      const lo = isMonth ? clampYM(shiftYM(state.ym, -1)) === state.ym : `${state.year - 1}-12` < minYM;
      const hi = isMonth ? clampYM(shiftYM(state.ym, 1)) === state.ym : `${state.year + 1}-01` > maxYM;
      prev.disabled = lo; next.disabled = hi;
      prev.setAttribute('aria-label', isMonth ? `${ui.prevMonth || 'Previous month'}${lo ? '' : `, ${monthLabel(shiftYM(state.ym, -1))}`}` : `${ui.prevYear || 'Previous year'}`);
      next.setAttribute('aria-label', isMonth ? `${ui.nextMonth || 'Next month'}${hi ? '' : `, ${monthLabel(shiftYM(state.ym, 1))}`}` : `${ui.nextYear || 'Next year'}`);
      toggle.dataset.view = state.view;
      btnMonth.setAttribute('aria-pressed', String(isMonth));
      btnYear.setAttribute('aria-pressed', String(!isMonth));
      prev.setAttribute('aria-controls', viewsId); next.setAttribute('aria-controls', viewsId);
    };

    const focusDay = (k) => {
      const b = monthPane.querySelector(`.cal__day[data-k="${k}"]`);
      if (b) { monthPane.querySelectorAll('.cal__day[tabindex="0"]').forEach((x) => { x.tabIndex = -1; }); b.tabIndex = 0; b.focus({ preventScroll: true }); }
    };

    /* ── animated changes ── */
    const animate = (el, frames, opts) => (reduced() || !el.animate ? Promise.resolve() : el.animate(frames, { duration: 420, easing: ease, fill: 'both', ...opts }).finished.catch(() => {}));

    async function showMonth(ym, dir = 0, { focus = null } = {}) {
      ym = clampYM(ym);
      if (state.busy) return;
      state.busy = true;
      const old = monthPane.firstElementChild;
      state.ym = ym; state.year = +ym.slice(0, 4);
      if (old && dir) await animate(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate3d(${-dir * 2.5}rem,0,0)` }], { duration: 180, easing: 'ease-in' });
      const grid = buildMonth(ym);
      monthPane.replaceChildren(grid);
      syncChrome();
      if (dir) await animate(grid, [{ opacity: 0, transform: `translate3d(${dir * 2.5}rem,0,0)` }, { opacity: 1, transform: 'none' }], { duration: 380 });
      state.busy = false;
      scrollListTo(monthHeading(ym));
      announce(fill(ui.showingMonth || 'Showing {label}', { label: monthLabel(ym) }));
      if (focus) focusDay(focus);
    }

    async function setView(view, { fromMini = null, focusAfter = false } = {}) {
      if (view === state.view || state.busy) return;
      state.busy = true;
      const goingYear = view === 'year';
      const from = goingYear ? monthPane : yearPane, to = goingYear ? yearPane : monthPane;
      if (goingYear) { state.year = +state.ym.slice(0, 4); yearPane.replaceChildren(buildYear(state.year)); }
      else monthPane.replaceChildren(buildMonth(state.ym));
      state.view = view; syncChrome();
      const mini = !goingYear && fromMini ? fromMini.getBoundingClientRect() : null, vr = views.getBoundingClientRect();
      if (mini) yearPane.style.transformOrigin = `${mini.left - vr.left + mini.width / 2}px ${mini.top - vr.top + mini.height / 2}px`;
      to.hidden = false;
      await Promise.all([
        animate(from, goingYear
          ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.94)' }]
          : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.35)' }], { duration: 380, easing: 'cubic-bezier(0.5, 0, 0.75, 0.4)' }),
        animate(to, goingYear
          ? [{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }]
          : [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }], { delay: reduced() ? 0 : 120, duration: 460 }),
      ]);
      from.hidden = true;
      [from, to].forEach((p) => { p.getAnimations?.().forEach((a) => a.cancel()); p.style.transformOrigin = ''; });
      state.busy = false;
      scrollListTo(monthHeading(state.ym));
      announce(fill(goingYear ? (ui.showingYear || 'Showing the year {label}') : (ui.showingMonth || 'Showing {label}'), { label: goingYear ? String(state.year) : monthLabel(state.ym) }));
      if (!goingYear && focusAfter) focusDay(state.sel && monthKey(state.sel) === state.ym ? state.sel : (monthKey(todayKey) === state.ym ? todayKey : `${state.ym}-01`));
    }

    async function showYear(y, dir) {
      if (state.busy) return;
      state.busy = true;
      state.year = y;
      const old = yearPane.firstElementChild;
      await animate(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate3d(${-dir * 2.5}rem,0,0)` }], { duration: 180, easing: 'ease-in' });
      const next = buildYear(y);
      yearPane.replaceChildren(next); syncChrome();
      await animate(next, [{ opacity: 0, transform: `translate3d(${dir * 2.5}rem,0,0)` }, { opacity: 1, transform: 'none' }], { duration: 380 });
      state.busy = false;
      announce(fill(ui.showingYear || 'Showing the year {label}', { label: String(y) }));
    }

    /* ── selecting a day / event ── */
    const select = (k, { jump = true } = {}) => {
      state.sel = k;
      monthPane.querySelectorAll('.cal__cell[aria-selected]').forEach((td) => td.setAttribute('aria-selected', String(td.querySelector('.cal__day')?.dataset.k === k)));
      const hits = [...list.querySelectorAll('.cal__event')].filter((li) => li.dataset.start <= k && li.dataset.end >= k);
      if (jump && hits.length) { scrollListTo(hits[0]); flash(hits); }
    };

    /* ── event details modal ── */
    const byUid = new Map(all.map((e) => [e.uid, e]));
    const dlgEl = {
      cat: dlg.querySelector('.cal-ev__cat'), title: dlg.querySelector('.cal-ev__title'), when: dlg.querySelector('.cal-ev__when'),
      desc: dlg.querySelector('.cal-ev__desc'), also: dlg.querySelector('.cal-ev__also'), link: dlg.querySelector('.cal-ev__link'),
    };
    const whenLong = (e) => (e.start === e.end ? F.full.format(toDate(e.start)) : `${F.full.format(toDate(e.start))} ${ui.to || 'to'} ${F.full.format(toDate(e.end))}`);
    const fillEvent = (e, dayKey) => {
      dlg.dataset.g = groupOf(e.cat);
      dlgEl.cat.textContent = e.cat || '';
      dlgEl.cat.hidden = !e.cat;
      dlgEl.title.textContent = e.title;
      dlgEl.when.replaceChildren(icon('calendar'), h('span', {}, whenLong(e)));
      dlgEl.desc.textContent = e.desc || '';
      dlgEl.desc.hidden = !e.desc;
      if (e.url) {
        dlgEl.link.hidden = false; dlgEl.link.href = e.url;
        dlgEl.link.replaceChildren(ui.source || 'More information', h('span.u-visually-hidden', {}, ` — ${e.title} ${content.ui('newTab')}`), icon('external'));
      } else dlgEl.link.hidden = true;
      const others = dayKey ? eventsOn(dayKey).filter((x) => x.uid !== e.uid) : [];
      dlgEl.also.hidden = !others.length;
      dlgEl.also.replaceChildren(...(others.length ? [h('p.cal-ev__also-title', {}, fill(ui.alsoOn || 'Also on {date}', { date: F.dayMonth.format(toDate(dayKey)) })),
        h('ul', { role: 'list' }, others.map((x) => h('li', { data: { g: groupOf(x.cat) } }, h('button', { type: 'button', data: { uid: x.uid, day: dayKey } }, x.title))))] : []));
    };
    const openEvent = (e, dayKey = null) => {
      fillEvent(e, dayKey);
      if (!dlg.open) { dlg.showModal(); dlg.dispatchEvent(new CustomEvent('dialog:open')); }
      dlg.scrollTop = 0;
      requestAnimationFrame(() => dlg.querySelector('.dialog__close')?.focus());
    };
    dlgEl.also.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-uid]'); if (!b) return;
      fillEvent(byUid.get(b.dataset.uid), b.dataset.day); dlg.scrollTop = 0; dlgEl.title.focus?.();
      announce(byUid.get(b.dataset.uid).title);
    });

    /* ── search / filter the list ── */
    const msg = h('p.cal__msg.cal__nomatch', { hidden: true });
    list.append(msg);
    let qTimer;
    const applyFilter = () => {
      const q = input.value.trim();
      state.q = q;
      let shown = 0;
      list.querySelectorAll('.cal__month').forEach((sec) => {
        let n = 0;
        sec.querySelectorAll('.cal__event').forEach((li) => {
          const ok = !q || terms().every((t) => li.dataset.q.includes(t));
          li.hidden = !ok; if (ok) n++;
        });
        sec.hidden = n === 0; shown += n;
      });
      msg.hidden = !q || shown > 0;
      msg.textContent = fill(ui.noMatch || 'No events match “{q}”.', { q });
      list.scrollTop = 0;
      if (state.view === 'month' && !state.busy) { const g = monthPane.firstElementChild; const cur = document.activeElement; monthPane.replaceChildren(buildMonth(state.ym)); if (cur?.closest?.('.cal__pane')) cur.blur?.(); void g; }
      announce(q ? fill(shown === 1 ? (ui.foundOne || '1 event found') : (ui.found || '{n} events found'), { n: shown }) : (ui.cleared || 'Showing all events'));
    };
    input.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(applyFilter, 150); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; applyFilter(); } });

    /* ── wiring ── */
    prev.addEventListener('click', () => (state.view === 'month' ? showMonth(shiftYM(state.ym, -1), -1) : showYear(state.year - 1, -1)));
    next.addEventListener('click', () => (state.view === 'month' ? showMonth(shiftYM(state.ym, 1), 1) : showYear(state.year + 1, 1)));
    [btnMonth, btnYear].forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

    monthPane.addEventListener('click', (e) => {
      const b = e.target.closest('.cal__day'); if (!b) return;
      monthPane.querySelectorAll('.cal__day[tabindex="0"]').forEach((x) => { x.tabIndex = -1; }); b.tabIndex = 0;
      select(b.dataset.k, { jump: false });
      const chip = e.target.closest('.cal__chip');
      const ev = chip ? byUid.get(chip.dataset.uid) : eventsOn(b.dataset.k)[0];
      if (ev) openEvent(ev, b.dataset.k);
    });
    monthPane.addEventListener('keydown', (e) => {
      const b = e.target.closest('.cal__day'); if (!b) return;
      const k = b.dataset.k, dt = toDate(k), wd = (dt.getDay() + 6) % 7;
      let to = null;
      switch (e.key) {
        case 'ArrowLeft': to = addDays(k, -1); break;
        case 'ArrowRight': to = addDays(k, 1); break;
        case 'ArrowUp': to = addDays(k, -7); break;
        case 'ArrowDown': to = addDays(k, 7); break;
        case 'Home': to = addDays(k, -wd); break;
        case 'End': to = addDays(k, 6 - wd); break;
        case 'PageUp': to = fromDate(new Date(dt.getFullYear(), dt.getMonth() - (e.shiftKey ? 12 : 1), Math.min(dt.getDate(), 28))); break;
        case 'PageDown': to = fromDate(new Date(dt.getFullYear(), dt.getMonth() + (e.shiftKey ? 12 : 1), Math.min(dt.getDate(), 28))); break;
        default: return;
      }
      e.preventDefault();
      const ym = monthKey(to);
      if (ym < minYM || ym > maxYM) return;
      if (ym === state.ym) focusDay(to);
      else showMonth(ym, to > k ? 1 : -1, { focus: to });
    });
    yearPane.addEventListener('click', (e) => {
      const b = e.target.closest('.cal__mini'); if (!b || b.disabled) return;
      state.ym = b.dataset.ym;
      setView('month', { fromMini: b, focusAfter: true });
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('.cal__event'); if (!li) return;
      const ev = byUid.get(li.dataset.uid);
      const k = li.dataset.start;
      if (state.view === 'year') { state.ym = clampYM(monthKey(k)); setView('month'); }
      else if (monthKey(k) !== state.ym) showMonth(monthKey(k), monthKey(k) > state.ym ? 1 : -1);
      state.sel = k;
      monthPane.querySelectorAll('.cal__cell[aria-selected]').forEach((td) => td.setAttribute('aria-selected', String(td.querySelector('.cal__day')?.dataset.k === k)));
      openEvent(ev, k);
    });

    // first paint, no animation
    monthPane.replaceChildren(buildMonth(state.ym));
    syncChrome();
  }

  return root;
}

async function load(s) {
  const r = await fetch(s.src);
  if (!r.ok) throw new Error(`${s.src} → ${r.status}`);
  return parseICS(await r.text());
}
