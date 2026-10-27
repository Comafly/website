import { WA_BOUNDS } from '../data/wa-outline.js';

/**
 * Procedural relief texture for the Western Australia map (rendered once, off-screen).
 * Regions are a noise-warped Voronoi diagram, each with its own palette and relief character:
 * Kimberley (green + red gorges), Pilbara (red ridges), Midwest (olive plains), Goldfields–Esperance (orange desert and
 * pale salt lakes), Wheatbelt (green/gold farm patchwork), South West (dark forest). Hill-shading is baked in from the NW.
 */
export const TEX_W = 640;
export const TEX_H = 945;             // keeps the equirectangular aspect used by the map projection (cos φ ≈ 0.9)
const [LON0, LON1] = WA_BOUNDS.lon;
const [LAT0, LAT1] = [-13.7, -35.1];

// seeded value noise
const PERM = new Uint8Array(512);
(() => { let a = 1337; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
const fade = (t) => t * t * (3 - 2 * t);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => PERM[(PERM[(xi + i) & 255] + yi + j) & 255] / 255;
  const u = fade(xf), v = fade(yf);
  return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
}
const fbm = (x, y, o = 5, g = 0.5) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); n += a; a *= g; f *= 2.03; } return s / n; };
const hash2 = (i, j) => PERM[(PERM[i & 255] + j) & 255] / 255;

const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// id, seed [lon, lat], weight (bigger = claims more land)
const REGIONS = [
  { id: 0, name: 'kimberley', at: [125.6, -17.2], w: 3.2 },
  { id: 1, name: 'pilbara', at: [119.6, -21.6], w: 2.4 },
  { id: 2, name: 'midwest', at: [116.6, -27.0], w: 1.6 },
  { id: 3, name: 'goldfields', at: [124.0, -28.8], w: 7.5 },
  { id: 4, name: 'wheatbelt', at: [117.7, -31.9], w: 0.5 },
  { id: 5, name: 'southwest', at: [116.2, -34.0], w: 0.2 },
];

export function makeTerrain() {
  const W = TEX_W, H = TEX_H;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H), px = img.data;
  const height = new Float32Array(W * H), rid = new Uint8Array(W * H), rgb = new Float32Array(W * H * 3);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const lon = LON0 + (x / W) * (LON1 - LON0), lat = LAT0 + (y / H) * (LAT1 - LAT0);
      // region (domain-warped weighted Voronoi so the borders look organic)
      const wx = lon + (fbm(x * 0.012, y * 0.012, 3) - 0.5) * 3.4, wy = lat + (fbm(x * 0.012 + 40, y * 0.012, 3) - 0.5) * 3.4;
      let best = 1e9, id = 0;
      for (const r of REGIONS) { const dx = (wx - r.at[0]) * 0.9, dy = wy - r.at[1]; const d = Math.sqrt(dx * dx + dy * dy) - r.w * 0.55; if (d < best) { best = d; id = r.id; } }
      rid[y * W + x] = id;

      const n1 = fbm(x * 0.02, y * 0.02, 5), n2 = fbm(x * 0.06 + 11, y * 0.06 + 3, 4), n3 = vnoise(x * 0.25, y * 0.25);
      let h, col;
      if (id === 0) {          // Kimberley: green plateaus cut by red gorges
        const ridge = 1 - Math.abs(2 * n1 - 1);
        h = ridge * ridge * 0.8 + n2 * 0.25;
        col = mix(hex(0x56802d), hex(0xc4552a), clamp01((ridge - 0.55) * 3.2));
        col = mix(col, hex(0x8f9a35), n2 * 0.45);
      } else if (id === 1) {   // Pilbara: red-brown ridges
        const ridge = 1 - Math.abs(2 * fbm(x * 0.028, y * 0.034, 5) - 1);
        h = ridge * ridge * 1.0 + n2 * 0.2;
        col = mix(hex(0x6e2b22), hex(0xc0502f), clamp01(h * 0.9 + n3 * 0.2));
      } else if (id === 2) {   // Midwest: olive plains and low hills
        h = n1 * 0.55 + n2 * 0.15;
        col = mix(hex(0x8e8a42), hex(0xc2ad62), clamp01(n2 * 1.3));
      } else if (id === 3) {   // Goldfields–Esperance: orange desert, salt lakes
        const ridge = 1 - Math.abs(2 * fbm(x * 0.022 + 7, y * 0.03, 5) - 1);
        h = ridge * ridge * 0.55 + n2 * 0.18;
        col = mix(hex(0xe3873a), hex(0xf2b867), clamp01(n1 * 1.2 - 0.1));
        col = mix(col, hex(0xb65a2a), clamp01((ridge - 0.7) * 3));
        const lake = fbm(x * 0.012 + 90, y * 0.012 + 20, 3);
        if (lake > 0.625) { const k = clamp01((lake - 0.625) * 10); col = mix(col, hex(0xf3e6c2), k); h *= 1 - 0.8 * k; }
      } else if (id === 4) {   // Wheatbelt: farm patchwork
        const gx = Math.floor((x * 0.9 + y * 0.12) / 17), gy = Math.floor((y * 0.9 - x * 0.12) / 17);
        const t = hash2(gx, gy);
        col = t < 0.4 ? mix(hex(0x3f7d24), hex(0x5ea32e), hash2(gy, gx)) : t < 0.7 ? mix(hex(0xb7ad3a), hex(0xd2c24a), hash2(gx + 3, gy)) : mix(hex(0x7aa032), hex(0x9bb83c), hash2(gx, gy + 5));
        h = 0.3 + n2 * 0.08;
      } else {                 // South West: forest
        h = n1 * 0.7 + n2 * 0.25;
        col = mix(hex(0x1f4a22), hex(0x4a7a30), clamp01(n2 * 1.1));
      }
      height[y * W + x] = h;
      const o = (y * W + x) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
    }
  }

  // hill-shading (light from the north-west) + region borders
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const hx = height[y * W + Math.min(W - 1, x + 1)] - height[y * W + Math.max(0, x - 1)];
      const hy = height[Math.min(H - 1, y + 1) * W + x] - height[Math.max(0, y - 1) * W + x];
      let sh = 0.82 - (hx + hy) * 2.6 + (height[i] - 0.4) * 0.35;
      sh = Math.max(0.42, Math.min(1.45, sh));
      let r = rgb[i * 3] * sh, gg = rgb[i * 3 + 1] * sh, b = rgb[i * 3 + 2] * sh;
      const edge = (x < W - 1 && rid[i] !== rid[i + 1]) || (y < H - 1 && rid[i] !== rid[i + W]);
      if (edge) { r = r * 0.35 + 255 * 0.65; gg = gg * 0.35 + 255 * 0.65; b = b * 0.35 + 255 * 0.65; }
      const o = i * 4; px[o] = r; px[o + 1] = gg; px[o + 2] = b; px[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
