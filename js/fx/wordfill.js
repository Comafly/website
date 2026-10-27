import { config } from '../config.js';
import { clamp, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop } from '../core/ticker.js';

/** Words in [data-wordfill] brighten one by one as the paragraph scrolls through the viewport. */
function wrapWords(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) frag.append(part);
      else { const w = document.createElement('span'); w.className = 'wf-word'; w.textContent = part; frag.append(w); }
    });
    node.replaceWith(frag);
  });
  return [...el.querySelectorAll('.wf-word')];
}

export function initWordfill(root = document) {
  if (!config.effects.wordfill) return;
  const items = [...root.querySelectorAll('[data-wordfill]')].map((el) => ({ el, words: wrapWords(el), top: 0, h: 0, last: [] }));
  if (!items.length) return;
  if (motion.reduced) { items.forEach((it) => it.words.forEach((w) => w.style.setProperty('--wf', 1))); return; }
  items.forEach((it) => it.words.forEach((w) => w.style.setProperty('--wf', 0)));
  onMeasure(() => items.forEach((it) => { it.top = pageTop(it.el); it.h = it.el.offsetHeight; }));
  onFrame((s) => {
    if (motion.reduced) { items.forEach((it) => it.words.forEach((w) => w.style.setProperty('--wf', 1))); return; }
    for (const it of items) {
      const vtop = it.top - s.sy;
      if (vtop > s.vh || vtop + it.h < 0) continue;
      const p = clamp((s.vh * 0.86 - vtop) / (s.vh * 0.42 + it.h));
      const span = 5, n = it.words.length;
      for (let i = 0; i < n; i++) {
        const v = Math.round(clamp((p * (n + span) - i) / span) * 50) / 50;
        if (it.last[i] !== v) { it.last[i] = v; it.words[i].style.setProperty('--wf', v); }
      }
    }
  });
}
