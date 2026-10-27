import { clamp, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';

/**
 * SETTLING INTO / OUT OF PINNED SCENES
 * A pinned stage (hero, banner, horizontal tracks, stage scene…) normally goes from "scrolling with the
 * page at full speed" to "stopped" in a single frame, which reads as a hard stop. Here the stage is nudged
 * so that, over the last stretch before it pins, its speed eases down to zero. (An ease-out on release was
 * tried and removed: it dragged the stage over the next section.)
 *
 *   speed profile h(u) = 2u² − u³  (h(0)=0, h'(0)=0, h(1)=1, h'(1)=1)  → no velocity jump at either end.
 */
const STAGES = '.seq__sticky, .banner__sticky, .hs__pin, .spot__sticky, .map__sticky';
const h = (u) => 2 * u * u - u * u * u;

export function initSettle(root = document) {
  const items = [...root.querySelectorAll(STAGES)].map((stage) => ({ stage, sec: stage.parentElement, top: 0, range: 1 }));
  items.forEach((it) => {
    onMeasure(() => { it.top = pageTop(it.sec); it.range = Math.max(1, it.sec.offsetHeight - scroll.vh); });
  });
  const clear = () => items.forEach((it) => { it.stage.style.transform = ''; });
  motion.onChange((r) => r && clear());

  onFrame((s) => {
    if (motion.reduced) return;
    const D = s.vh * 0.9;
    items.forEach((it) => {
      const d = it.top - s.y;                     // distance still to go before the stage pins
      let shift = 0;
      if (d > 0 && d < D) shift = D * h(d / D) - d;            // negative: held back toward the pin point
      if (shift !== it.last) {
        it.last = shift;
        it.stage.style.transform = shift ? `translate3d(0, ${shift.toFixed(2)}px, 0)` : '';
      }
    });
  });
}
