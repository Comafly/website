import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { paras, plain } from '../core/rich.js';
import { motion } from '../core/motion.js';
import { sectionHead } from './parts.js';
import { shell } from './shell-helpers.js';

/**
 * Curriculum: the year-group buttons are the section's headers (Primary / Secondary). Each level has a narrow list of
 * learning areas on the left; choosing one fills the details panel on the right. The first area is selected by default.
 * Two nested ARIA tab lists (roving tabindex, arrow keys, Home / End).
 */
function roving(list, tabs, select) {
  list.addEventListener('keydown', (e) => {
    const vertical = list.getAttribute('aria-orientation') === 'vertical';
    const next = vertical ? 'ArrowDown' : 'ArrowRight';
    const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === next) j = (i + 1) % tabs.length;
    else if (e.key === prev) j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    if (j === null) return;
    e.preventDefault();
    tabs[j].focus();
    select(tabs[j]);
  });
}

export function curriculum(s) {
  const { el: head, titleId } = sectionHead(s, { titleClass: 't-h1' });
  const root = shell(s, `cur tone-${s.tone || 'ink'}`, titleId);
  const base = s.anchor || 'cur';

  // ── level buttons (the headers) ──
  const levelTabs = s.levels.map((lv, i) => h('button', {
    class: 'cur__level', type: 'button', role: 'tab', id: `${base}-level-${i}`, 'aria-controls': lv.anchor || `${base}-panel-${i}`,
    'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1',
  }, h('span.cur__level-name', {}, lv.label), lv.eyebrow && h('span.cur__level-years', {}, lv.eyebrow)));
  const levelList = h('div.cur__levels', { role: 'tablist', 'aria-label': s.levelsLabel || 'Year group' }, levelTabs);

  // ── a panel per level ──
  const panels = s.levels.map((lv, li) => {
    const aTabs = lv.areas.map((a, ai) => h('button', {
      class: 'cur__area', type: 'button', role: 'tab', id: `${base}-${li}-area-${ai}`, 'aria-controls': `${base}-${li}-detail-${ai}`,
      'aria-selected': ai === 0 ? 'true' : 'false', tabindex: ai === 0 ? '0' : '-1',
    }, h('span.cur__area-num', { aria: { hidden: 'true' } }, String(ai + 1).padStart(2, '0')), h('span.cur__area-name', {}, plain(a.title)), icon('arrowRight')));
    const aList = h('div.cur__areas', { role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': `${s.areasLabel || 'Learning areas'}: ${lv.label}` }, aTabs);
    const details = lv.areas.map((a, ai) => h('div', {
      class: 'cur__detail', role: 'tabpanel', id: `${base}-${li}-detail-${ai}`, 'aria-labelledby': `${base}-${li}-area-${ai}`, tabindex: '0', hidden: ai === 0 ? null : '',
    },
    h('p.cur__detail-kicker', {}, `${lv.label} · ${lv.eyebrow || ''}`),
    h('h3.cur__detail-title', {}, plain(a.title)),
    h('div.cur__detail-text', {}, paras(a.body).map((html) => h('p', { html })))));
    const detailWrap = h('div.cur__details', {}, details);

    const selectArea = (tab) => {
      const k = aTabs.indexOf(tab);
      aTabs.forEach((t, n) => { t.setAttribute('aria-selected', n === k ? 'true' : 'false'); t.tabIndex = n === k ? 0 : -1; });
      const prev = details.find((d) => !d.hidden);
      const next = details[k];
      if (prev === next) return;
      details.forEach((d) => { d.hidden = d !== next; });
      if (!motion.reduced && next.animate) next.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' });
    };
    aTabs.forEach((t) => t.addEventListener('click', () => selectArea(t)));
    roving(aList, aTabs, selectArea);

    return h('div', {
      class: 'cur__panel', role: 'tabpanel', id: lv.anchor || `${base}-panel-${li}`, 'aria-labelledby': `${base}-level-${li}`,
      hidden: li === 0 ? null : 'until-found', data: { curLevel: true },
    }, h('div.cur__layout', {}, aList, detailWrap));
  });

  const selectLevel = (tab) => {
    const k = levelTabs.indexOf(tab);
    levelTabs.forEach((t, n) => { t.setAttribute('aria-selected', n === k ? 'true' : 'false'); t.tabIndex = n === k ? 0 : -1; });
    panels.forEach((p, n) => {
      const show = n === k;
      if (show && p.hidden) {
        p.hidden = false;
        if (!motion.reduced && p.animate) p.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' });
      } else if (!show) p.hidden = 'until-found';
    });
    root.style.setProperty('--lv', k);
  };
  levelTabs.forEach((t) => t.addEventListener('click', () => selectLevel(t)));
  roving(levelList, levelTabs, selectLevel);
  root.style.setProperty('--lv', 0);

  root.append(h('div.container.cur__inner', {}, head, levelList, h('div.cur__panels', {}, panels)));
  return root;
}
