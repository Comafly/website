import { clamp, ease, lerp, motion } from '../core/motion.js';
import { onFrame, onMeasure, pageTop, scroll } from '../core/ticker.js';
import { WA_OUTLINE, insideWA } from '../data/wa-outline.js';

/**
 * Pseudo-3D map of Western Australia (canvas 2D, own projection).
 *   - the land is a slab: stacked, projected copies of the outline give it thickness
 *   - the camera (tilt, yaw, zoom, pan) is a function of scroll progress
 *   - markers drop from above onto the map, bounce, and send out a ripple ring when they land
 *   - markers are generated from the cluster list in the page JSON (seeded, so the layout is stable)
 */
const D = 34;                      // camera distance in map units (sets perspective strength)
const COS_LAT = 0.9;               // equirectangular squeeze at ~-26°
const THICK = 0.9;                 // slab thickness (map units)
// teardrop outline, tip at the origin and pointing down; r is the head radius
const PIN_A = Math.asin(0.5), PIN_D = 2;
function drawPin(ctx, x, y, r, col) {
  const d = r * PIN_D, tx = r * Math.cos(PIN_A), ty = -d + r * Math.sin(PIN_A);
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + tx, y + ty);
  ctx.arc(x, y - d, r, PIN_A, Math.PI - PIN_A, true);
  ctx.closePath();
  ctx.moveTo(x + r * 0.46, y - d);
  ctx.arc(x, y - d, r * 0.46, 0, Math.PI * 2, true);          // the hole (even-odd: the map shows through)
  ctx.fillStyle = col; ctx.fill('evenodd');
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(10,24,38,.45)'; ctx.stroke();
}

const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function initMaps(root = document) {
  const all = [...root.querySelectorAll('[data-map]')].map((el) => new WaMap(el));
  const onMotion = (r) => all.forEach((m) => m.setStatic(r));
  onMotion(motion.reduced);
  motion.onChange(onMotion);
}

class WaMap {
  constructor(el) {
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sticky = el.querySelector('.map__sticky');
    this.countEl = el.querySelector('[data-map-count]');
    this.font = getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace';
    this.static = false; this.lastP = -1; this.top = 0; this.range = 1; this.W = 0; this.H = 0; this.dpr = 1;
    this.pins = this.makePins(JSON.parse(el.dataset.clusters));
    onMeasure(() => this.measure());
    onFrame((s) => this.frame(s));
  }

  makePins(clusters) {
    const rnd = mulberry(287);
    const pins = [];
    const lat = clusters.map((c) => c.lat);
    const latMax = Math.max(...lat), latMin = Math.min(...lat);
    clusters.forEach((c) => {
      const n = Math.max(1, Math.round(c.count / 9));           // a sample of the network, not every school
      for (let i = 0; i < n; i++) {
        let lo, la, tries = 0;
        do {
          const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * c.spread;
          lo = c.lon + Math.cos(a) * r / COS_LAT; la = c.lat + Math.sin(a) * r;
        } while (!insideWA(lo, la) && ++tries < 40);
        if (tries >= 40) { lo = c.lon; la = c.lat; }
        const north = (latMax - la) / (latMax - latMin + 1e-6);          // 0 = far north … 1 = far south
        pins.push({
          lon: lo, lat: la, cluster: c,
          scale: clamp(1.25 - c.count / 160, 0.8, 1.2),
          col: `hsl(${(39 + rnd() * 5).toFixed(1)} ${(52 + rnd() * 10).toFixed(0)}% ${(54 + rnd() * 12).toFixed(0)}%)`,   // our yellow, very slightly varied
          start: 0.08 + 0.6 * (north * 0.55 + rnd() * 0.45),
          dur: 0.085 + rnd() * 0.03,
        });
      }
    });
    return pins.sort((a, b) => a.start - b.start);
  }

  setStatic(on) { this.static = on; this.el.classList.toggle('is-static', on); this.dirty = true; }

  measure() {
    this.top = pageTop(this.el);
    this.range = Math.max(1, this.el.offsetHeight - scroll.vh);
    const w = this.sticky.clientWidth, h = this.sticky.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    if (w !== this.W || h !== this.H) {
      this.W = w; this.H = h;
      this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr);
      this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
    }
    this.dirty = true;
  }

  frame(s) {
    const visible = s.y > this.top - s.vh * 1.05 && s.y < this.top + this.range + s.vh * 1.05;
    if (!visible) return;
    const p = this.static ? 0.92 : clamp((s.y - this.top) / this.range);
    // everything is a pure function of scroll progress, so an idle page costs nothing
    if (!this.dirty && Math.abs(p - this.lastP) < 0.0004) return;
    this.dirty = false; this.lastP = p;
    this.draw(p);
  }

  /* ── camera ── */
  setCamera(p) {
    const { W, H } = this;
    const e = ease.inOutSine(p);
    this.th = lerp(58, 40, e) * Math.PI / 180;                  // tilt from vertical
    this.psi = lerp(-13, 11, e) * Math.PI / 180;                // yaw
    this.zoom = lerp(1, 1.16, e);
    this.lat0 = lerp(-23.2, -26.6, e);
    this.lon0 = lerp(120.4, 121.4, e);
    const wide = W > 900;
    const fitH = (H * (wide ? 0.8 : 0.36)) / (21.4 * Math.cos(this.th) + 3);
    const fitW = (W * (wide ? 0.58 : 0.92)) / 15.5;
    this.S = Math.min(fitH, fitW) * this.zoom;
    this.ox = wide ? W * 0.66 : W * 0.5;
    this.oy = H * (wide ? 0.52 : 0.2);
    this.ct = Math.cos(this.th); this.st = Math.sin(this.th); this.cy = Math.cos(this.psi); this.sy = Math.sin(this.psi);
  }

  proj(X, Y, Z) {
    const x1 = X * this.cy - Y * this.sy, y1 = X * this.sy + Y * this.cy;
    const d = D + y1 * this.st - Z * this.ct;
    const f = D / d;
    return { x: this.ox + x1 * f * this.S, y: this.oy - (y1 * this.ct + Z * this.st) * f * this.S, f, d };
  }

  ll(lon, lat, Z = 0) { return this.proj((lon - this.lon0) * COS_LAT, lat - this.lat0, Z); }

  draw(p) {
    const { ctx, W, H, dpr } = this;
    this.setCamera(p);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, W, H);                                    // sea gradient is CSS, so the lines can flow behind the map

    this.grid(0.06);

    // slab: stacked outlines from the bottom up give the land thickness
    const layers = 4;
    for (let i = 0; i <= layers; i++) {
      const z = -THICK * (1 - i / layers);
      this.path(z);
      if (i < layers) { ctx.fillStyle = `rgb(${10 + i * 3}, ${34 + i * 5}, ${52 + i * 6})`; ctx.fill(); }
    }
    // top face
    const top = this.ll(121, -14), bot = this.ll(121, -35);
    const g = ctx.createLinearGradient(0, top.y, 0, bot.y);
    g.addColorStop(0, '#24566f'); g.addColorStop(0.5, '#1a4560'); g.addColorStop(1, '#123248');
    this.path(0); ctx.fillStyle = g; ctx.fill();
    ctx.save(); this.path(0); ctx.clip(); this.grid(0.16); ctx.restore();
    this.path(0);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(127,178,204,.18)'; ctx.lineWidth = 7; ctx.stroke();      // soft glow without shadowBlur
    ctx.strokeStyle = 'rgba(127,178,204,.85)'; ctx.lineWidth = 1.6; ctx.stroke();

    this.markers(p);
  }

  path(z) {
    const { ctx } = this;
    ctx.beginPath();
    WA_OUTLINE.forEach(([lo, la], i) => { const q = this.ll(lo, la, z); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
    ctx.closePath();
  }

  grid(alpha) {
    const { ctx } = this;
    ctx.strokeStyle = `rgba(127,178,204,${alpha})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lo = 108; lo <= 134; lo += 4) { const a = this.ll(lo, -40), b = this.ll(lo, -8); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    for (let la = -40; la <= -8; la += 4) { const a = this.ll(108, la), b = this.ll(134, la); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
  }

  markers(p) {
    const { ctx } = this;
    const R = (this.S * (this.W > 900 ? 0.34 : 0.28));
    const list = [];
    let landed = 0;
    const regionLanded = new Map();
    for (const pin of this.pins) {
      const t = clamp((p - pin.start) / pin.dur);
      if (t <= 0) continue;
      if (t >= 0.8) { landed++; regionLanded.set(pin.cluster, (regionLanded.get(pin.cluster) || 0) + 1); }
      const base = this.ll(pin.lon, pin.lat, 0);
      list.push({ pin, t, depth: base.d });
    }
    list.sort((a, b) => b.depth - a.depth);                       // far first

    for (const { pin, t } of list) {
      // fall (accelerating), then a small damped bounce
      const fall = 0.8;
      let z;
      if (t < fall) { const k = t / fall; z = 9 * (1 - k * k); }
      else { const k = (t - fall) / (1 - fall); z = 0.9 * Math.abs(Math.sin(k * Math.PI * 1.5)) * (1 - k); }
      const sc = pin.scale;
      const ground = this.ll(pin.lon, pin.lat, 0);
      const tip = this.ll(pin.lon, pin.lat, z);
      const r = Math.max(2.2, R * 0.5 * sc * tip.f);

      // contact shadow shrinks as the pin comes down
      const sh = clamp(1 - z / 9);
      ctx.fillStyle = `rgba(0,0,0,${0.12 + 0.3 * sh})`;
      ctx.beginPath(); ctx.ellipse(ground.x, ground.y, r * (0.5 + 0.7 * sh), r * (0.5 + 0.7 * sh) * this.ct, 0, 0, Math.PI * 2); ctx.fill();

      // landing ripple on the map surface
      if (t > fall && t < 1) {
        const k = (t - fall) / (1 - fall);
        ctx.strokeStyle = `rgba(210,173,105,${0.7 * (1 - k)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(ground.x, ground.y, r * (1 + 3.2 * k), r * (1 + 3.2 * k) * this.ct, 0, 0, Math.PI * 2); ctx.stroke();
      }

      // pin: classic map-marker teardrop (tip on the ground, hollow centre), yellow with a slightly different shade per pin
      const pr = Math.max(3, R * 0.5 * sc * tip.f);
      drawPin(ctx, tip.x, tip.y, pr, pin.col);
    }

    // region labels fade in as their markers land
    ctx.font = `600 ${this.W > 700 ? 12 : 10}px ${this.font}`;
    ctx.lineJoin = 'round'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const [c, n] of regionLanded) {
      if (!c.label) continue;
      const a = clamp(n / Math.max(1, Math.round(c.count / 9) * 0.6));
      const q = this.ll(c.lon + (c.dx || 0), c.lat + (c.dy || 0), 2.4);
      const t = c.label.toUpperCase();
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(6,15,26,${0.8 * a})`; ctx.strokeText(t, q.x, q.y);
      ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`; ctx.fillText(t, q.x, q.y);
    }

    if (this.countEl) {
      const v = this.static || landed >= this.pins.length ? Number(this.el.dataset.total) : Math.round(landed / this.pins.length * Number(this.el.dataset.total));
      if (this.countEl.textContent !== String(v)) this.countEl.textContent = String(v);
    }
  }
}
