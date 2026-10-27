import { motion, clamp } from '../core/motion.js';
import { onFrame, onMeasure, pageTop } from '../core/ticker.js';

/**
 * FLOWING LINES
 * Three strands travel down the whole page, drawn in *document* coordinates so they scroll with the
 * content and are revealed top-to-bottom by a "head" that glides ahead of the reader.
 *
 * Each strand has its own route: at every section it is given a lateral "lane" (a horizontal
 * position) and a Catmull-Rom spline carries it from lane to lane, so it keeps turning and curving
 * with no flat spots or hitches at section boundaries. A slow braid is layered on top for the swirl.
 * On the splash all three sit on the right; in the footer they converge to a single point.
 *
 * Enable per page with  "meta": { "flow": true }  in the page JSON.
 */
const STRANDS = [
  { color: [210, 173, 105], phase: 0, hero: 0.9 },                    // yellow accent
  { color: [191, 49, 75], phase: (Math.PI * 2) / 3, hero: 0.935 },    // button accent
  { color: [127, 178, 204], phase: (Math.PI * 4) / 3, hero: 0.97 },   // pale blue
];
// Choreography, one entry per section after the splash (cycled). `b` is where the bundle of strands
// travels; `solo` is a strand that breaks away to `sx` and swirls around that section, then rejoins.
const SCRIPT = [
  { b: 0.9, solo: 0, sx: 0.43, amp: 0.5 },   // yellow veers left (half as far) around this section
  { b: 0.9 },                       // …and returns to the bundle
  { b: 0.03 },                      // everyone drifts to the left
  { b: 0.11, solo: 1, sx: 1.04 },   // red breaks right
  { b: 0.93 },                      // far right through the swimming scene
  { b: 0.97 },
  { b: 0.86, solo: 0, sx: 0.5 },
  { b: 0.86 },
  { b: 0.12, solo: 1, sx: 1.03 },
];
const STEP = 10;

export function initFlow() {
  if (motion.reduced) return;
  const mk = (cls) => {
    const c = document.createElement('canvas');
    c.className = cls;
    c.setAttribute('aria-hidden', 'true');
    return c;
  };
  // Main layer sits behind all content (but above section backgrounds, see _layouts.scss).
  // Full-bleed photo stages (hero, banner) trap their own backgrounds, so each gets a layer inside it,
  // between the photo and the copy.
  const canvas = mk('flow');
  document.body.append(canvas);
  document.body.classList.add('has-flow');
  const layers = [{ canvas, ctx: canvas.getContext('2d'), host: null }];
  document.querySelectorAll('.seq--hero .seq__sticky, .seq--stage .seq__sticky, .banner__sticky, .spot__sticky').forEach((host) => {
    const c = mk('flow flow--host');
    const copy = host.querySelector('.seq__copy, .seq__stagecopy, .banner__copy, .spot__copy, .map__copy');
    host.insertBefore(c, copy || null);
    layers.push({ canvas: c, ctx: c.getContext('2d'), host });
  });
  let dpr = 1, W = 0, H = 0, docH = 1, endY = 1, endX = 0.8, route = [], bumps = [], head = 0;
  const born = performance.now();

  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = window.innerWidth; H = window.innerHeight;
    layers.forEach((l) => {
      l.canvas.width = Math.round(W * dpr); l.canvas.height = Math.round(H * dpr);
      l.canvas.style.width = `${W}px`; l.canvas.style.height = `${H}px`;
    });
  };

  onMeasure(() => {
    size();
    docH = document.documentElement.scrollHeight;
    // The strands finish on the footer's call-to-action button: they arrive from the right, turning left.
    const target = document.querySelector('.site-footer .btn');
    if (target) {
      const r = target.getBoundingClientRect();
      endY = r.top + window.scrollY + r.height / 2;
      endX = (r.right - 14) / W;
    } else { endY = docH - H * 0.2; endX = 0.8; }
    const secs = [...document.querySelectorAll('#main > *')].filter((el) => el.offsetHeight > 0).map((el) => ({ top: pageTop(el), h: el.offsetHeight, ways: el.matches('.seq--stage'), frames: parseInt(el.style.getPropertyValue('--frames'), 10) || 3 }));
    bumps = [[], [], []];
    route = STRANDS.map((st, k) => {
      const pts = [{ y: -H, x: st.hero }];                        // stays right on the splash
      secs.forEach((sc, i) => {
        if (i === 0) {                                              // pin the splash to the right, a point per screen
          for (let y = sc.top; y < sc.top + sc.h * 0.97; y += H * 0.8) pts.push({ y, x: st.hero });
          pts.push({ y: sc.top + sc.h * 0.97, x: st.hero });
          return;
        }
        if (sc.ways) {                                              // "Three ways to learn": yellow right at Home-based, blue at School-based, red at Blended
          const n = Math.max(1, sc.frames - 1);
          const stp = Math.max(1, (sc.h - H) / n), mid = (f) => sc.top + f * stp + H / 2;
          const L = 0.06 + (k - 1) * 0.035, R = [0.86, 0.95, 0.91][k];
          const at = [0, 2, 1][k];
          // cross along the top of the screen at the moment the slide settles, then curve down the right-hand side
          const c = sc.top + at * stp + H * 0.1;
          const from = c - H * 0.17, to = c + H * 0.17;
          pts.push({ y: from - stp * 0.25, x: L }, { y: from, x: L }, { y: c, x: (L + R) / 2 }, { y: to, x: R }, { y: to + H * 0.3, x: R }, { y: sc.top + sc.h * 0.95, x: R });
          return;
        }
        const step = SCRIPT[(i - 1) % SCRIPT.length];
        const isSolo = step.solo === k;
        const lane = isSolo ? step.sx : step.b + (k - 1) * 0.035;
        pts.push({ y: sc.top + sc.h * 0.3, x: lane }, { y: sc.top + sc.h * 0.7, x: lane });
        if (isSolo) bumps[k].push({ ...sc, amp: step.amp ?? 1 });
      });
      // Keep falling down the right-hand side, then sweep in a wide quarter-ellipse (down → left) onto the button.
      const dy = H * 0.85, xr = Math.min(0.94, 0.86 + (k - 1) * 0.03), dx = Math.max(0.2, xr - endX);
      const straightY = endY - dy - H * 0.45;
      while (pts.length > 1 && pts[pts.length - 1].y > straightY - H * 0.2) pts.pop();
      pts.push({ y: straightY, x: xr });
      for (let n = 0; n <= 8; n++) {
        const th = (n / 8) * (Math.PI / 2);
        pts.push({ y: endY - dy + dy * Math.sin(th), x: endX + dx * Math.cos(th) });
      }
      pts.push({ y: endY + H * 0.12, x: endX - 0.08 });
      return pts;
    });
  }, 1);

  motion.onChange((reduced) => layers.forEach((l) => { l.canvas.style.display = reduced ? 'none' : ''; }));

  // Catmull-Rom through the lane points: continuous tangents, so the strand never stalls at a section edge.
  function laneAt(pts, Y) {
    let i = 0;
    while (i < pts.length - 2 && Y > pts[i + 1].y) i++;
    const p0 = pts[Math.max(0, i - 1)].x, p1 = pts[i].x, p2 = pts[i + 1].x, p3 = pts[Math.min(pts.length - 1, i + 2)].x;
    const u = clamp((Y - pts[i].y) / Math.max(1, pts[i + 1].y - pts[i].y));
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  }

  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  function xAt(k, Y, t) {
    const lane = laneAt(route[k], Y) * W;
    const conv = 1 - smooth(endY - H * 0.9, endY - H * 0.05, Y);          // braid fades away as the strands converge
    // gentle, slow braiding: low amplitude, long wavelengths, slow drift in time
    const swirl = (15 + 0.02 * W) * conv * Math.sin(Y * 0.0022 + t * 0.00018 + STRANDS[k].phase)
      * (0.65 + 0.35 * Math.sin(Y * 0.0009 + STRANDS[k].phase * 1.3))
      + (4 + 0.004 * W) * conv * Math.sin(Y * 0.0046 - t * 0.00012 + STRANDS[k].phase * 2.1);
    const ripple = 1.2 * conv * Math.sin(Y * 0.007 + t * 0.0004 + STRANDS[k].phase * 2);
    let loop = 0;
    for (const sc of bumps[k]) {                                          // a breakaway strand loops around its section
      if (Y < sc.top || Y > sc.top + sc.h) continue;
      const u = (Y - sc.top) / sc.h;
      loop = (sc.amp ?? 1) * W * 0.06 * Math.pow(Math.sin(Math.PI * u), 1.4) * Math.sin(u * Math.PI * 2.4 + STRANDS[k].phase);
    }
    return lane + swirl + ripple + loop;                                 // may run past the screen edge; the canvas simply clips it
  }

  // centre-line point + ribbon width at document row Y
  function sample(k, Y, sy, t) {
    const ph = STRANDS[k].phase;
    const swell = 0.5 + 0.5 * Math.sin(Y * 0.0026 + ph * 1.7 + t * 0.00014);        // slow breathing
    const twist = 0.5 + 0.5 * Math.sin(Y * 0.0042 - ph + t * 0.00024);               // quicker flutter
    const conv = smooth(endY - H * 0.5, endY - H * 0.02, Y);                          // settle to a steady width at the button
    let w = 1.4 + (W < 700 ? 4 : 6.5) * Math.pow(swell * (0.4 + 0.6 * twist), 1.2);
    w = w * (1 - conv) + 3.2 * conv;
    return { x: xAt(k, Y, t), y: Y - sy, w };
  }

  // smooth open path through a list of points (quadratic midpoints)
  function edge(ctx, pts, joining) {
    if (joining) ctx.lineTo(pts[0].x, pts[0].y); else ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
    }
    const e = pts[pts.length - 1];
    ctx.lineTo(e.x, e.y);
  }

  function draw(l, s, t, y0, y1, fadeEnd, tail) {
    const { ctx } = l;
    const r = l.host ? l.host.getBoundingClientRect() : { left: 0, top: 0 };
    ctx.setTransform(dpr, 0, 0, dpr, -r.left * dpr, -r.top * dpr);   // draw in viewport coordinates on every layer
    ctx.clearRect(r.left, r.top, W, H);
    STRANDS.forEach((st, k) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      const [cr, cg, cb] = st.color;
      const rgba = (a) => `rgba(${cr},${cg},${cb},${a})`;
      g.addColorStop(0, rgba(0));
      g.addColorStop(0.06, rgba(0.85));
      g.addColorStop(Math.max(0.45, Math.min(fadeEnd - 0.12, 1)), rgba(0.85));
      g.addColorStop(Math.min(fadeEnd, 1), rgba(0.85 * (1 - tail)));
      if (fadeEnd >= 1) g.addColorStop(1, rgba(0.85 * (1 - tail)));
      ctx.fillStyle = g;
      // Sample the centre line, give every sample a width, then fill the outline: a ribbon that swells and
      // tapers (down to a hair-line) as it travels, instead of a constant-width stroke.
      const P = [];
      for (let Y = y0; Y <= y1; Y += STEP) P.push(sample(k, Y, s.y, t));
      if (y1 >= endY - 0.5) P.push(sample(k, endY, s.y, t));
      if (P.length < 2) return;
      const L = [], R = [];
      for (let i = 0; i < P.length; i++) {
        const a0 = P[Math.max(0, i - 1)], a1 = P[Math.min(P.length - 1, i + 1)];
        let tx = a1.x - a0.x, ty = a1.y - a0.y;
        const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        const hw = P[i].w / 2;
        L.push({ x: P[i].x - ty * hw, y: P[i].y + tx * hw });
        R.push({ x: P[i].x + ty * hw, y: P[i].y - tx * hw });
      }
      ctx.beginPath();
      edge(ctx, L, false);
      edge(ctx, R.reverse(), true);
      ctx.closePath();
      ctx.fill();
    });
  }

  onFrame((s, t) => {
    if (motion.reduced || !route.length) return;
    const intro = clamp((performance.now() - born) / 2400);
    const introHead = H * 0.78 * (1 - Math.pow(1 - intro, 3));
    const target = Math.max(s.y + H * 0.85, introHead);
    head += (target - head) * (1 - Math.exp(-4.2 * s.dt));
    const y0 = s.y - 16, y1 = Math.min(head, endY);
    const tail = clamp((endY - head) / (H * 0.3));                    // 1 while the head is still travelling, 0 once it reaches the button
    const fadeEnd = clamp((y1 - s.y) / H, 0.05, 1.2);
    let covered = false;
    layers.forEach((l, i) => {
      if (!l.host) return;
      const r = l.host.getBoundingClientRect();
      l.visible = r.bottom > 0 && r.top < H;
      if (r.top <= 1 && r.bottom >= H - 1) covered = true;          // a photo stage fills the screen
    });
    layers.forEach((l) => {
      if (l.host ? l.visible : !covered) draw(l, s, t, y0, y1, fadeEnd, tail);
      else if (l.drawn) { l.ctx.setTransform(1, 0, 0, 1, 0, 0); l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height); }
      l.drawn = l.host ? l.visible : !covered;
    });
  });
}
