import { clamp, ease, lerp, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';

/** Full-bleed photo that scrubs from a small, desaturated, rounded card to edge-to-edge colour. */
export function initBanners(root = document) {
  const items = [...root.querySelectorAll('[data-banner]')].map((el) => ({
    el, frame: el.querySelector('[data-banner-frame]'), img: el.querySelector('img'), copy: el.querySelector('[data-banner-copy]'), article: el.querySelector('[data-banner-article]'),
    tint: el.querySelector('.banner__tint'), top: 0, range: 1,
  }));
  // The article is re-split into its rendered lines (so each one can fade in on its own) whenever the width changes.
  const splitLines = (it) => {
    if (!it.article) return;
    const w = it.article.clientWidth;
    if (it.splitW === w) return;
    it.splitW = w;
    it.lines = [];
    it.article.querySelectorAll('p').forEach((p) => {
      if (p.dataset.text === undefined) p.dataset.text = p.textContent.trim();
      p.textContent = '';
      const words = p.dataset.text.split(/\s+/).map((t) => { const sp = document.createElement('span'); sp.textContent = `${t} `; sp.style.display = 'inline'; p.append(sp); return sp; });
      const rows = [];
      words.forEach((sp) => { const y = sp.offsetTop; const last = rows[rows.length - 1]; if (last && last.y === y) last.t += sp.textContent; else rows.push({ y, t: sp.textContent }); });
      p.textContent = '';
      rows.forEach((r) => { const l = document.createElement('span'); l.className = 'banner__line'; l.textContent = r.t.trimEnd(); p.append(l, ' '); it.lines.push(l); });
    });
  };
  onMeasure(() => items.forEach((it) => { it.top = pageTop(it.el); it.range = Math.max(1, it.el.offsetHeight - scroll.vh); splitLines(it); }));
  const reset = () => items.forEach((it) => { it.frame.style.cssText = ''; if (it.img) it.img.style.cssText = ''; it.copy.style.cssText = ''; if (it.article) it.article.style.cssText = ''; (it.lines || []).forEach((l) => { l.style.cssText = ''; }); if (it.tint) it.tint.style.cssText = ''; });
  motion.onChange((r) => r && reset());
  onFrame((s) => {
    if (motion.reduced) return;
    for (const it of items) {
      const into = s.sy - it.top;
      if (into < -s.vh * 1.1 || into > it.range + s.vh * 1.1) continue;
      const p = clamp(into / it.range);
      const e = ease.inOutCubic(clamp(p / 0.5));
      const inset = `${lerp(13, 0, e).toFixed(2)}vh ${lerp(9, 0, e).toFixed(2)}vw`;
      it.frame.style.clipPath = `inset(${inset} round ${lerp(56, 0, e).toFixed(1)}px)`;
      if (it.img) {
        it.img.style.transform = `scale(${lerp(1.38, 1.02, e).toFixed(3)})`;
        it.img.style.filter = `grayscale(${(1 - e).toFixed(3)}) contrast(${lerp(1.25, 1, e).toFixed(3)})`;
      }
      if (it.tint) it.tint.style.opacity = lerp(0.7, 0.28, e).toFixed(3);
      const c = ease.outCubic(clamp((p - 0.38) / 0.3));
      const ap = it.article ? clamp((p - 0.5) / 0.44) : 0;
      // on narrow screens the article takes over from the headline instead of sharing the space
      const hide = it.article && s.vw < 900 ? ease.inOutSine(clamp((p - 0.5) / 0.14)) : 0;
      it.copy.style.opacity = (c * (1 - hide)).toFixed(3);
      it.copy.style.transform = `translate3d(0, ${((1 - c) * 60).toFixed(1)}px, 0)`;
      if (it.article && it.lines) {
        it.article.style.opacity = ease.outCubic(clamp(ap * 6)).toFixed(3);              // the scrim arrives first…
        const n = it.lines.length;
        it.lines.forEach((l, i) => {                                                         // …then every line, one after another
          const k = ease.outCubic(clamp((ap - (i / n) * 0.72) / 0.26));
          l.style.opacity = k.toFixed(3);
          l.style.transform = `translate3d(0, ${((1 - k) * 22).toFixed(1)}px, 0)`;
        });
      }
    }
  });
}
