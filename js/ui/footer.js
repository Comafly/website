import { motion } from '../core/motion.js';
import { content } from '../core/content.js';
import { $ } from '../core/dom.js';

/** Footer tools: user-controlled "reduce motion" switch (overrides the OS setting) and back-to-top. */
export function initFooter() {
  const btn = $('[data-motion-toggle]');
  if (!btn) return;
  const label = $('[data-motion-label]', btn);
  const sync = () => {
    btn.setAttribute('aria-pressed', String(motion.reduced));
    label.textContent = content.ui(motion.reduced ? 'motion.restore' : 'motion.reduce');
  };
  btn.addEventListener('click', () => { motion.set(motion.reduced ? 'full' : 'reduced'); });
  motion.onChange(sync);
  sync();
}
