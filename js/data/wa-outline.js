/**
 * Simplified outline of Western Australia as [longitude, latitude] pairs (clockwise from the NE corner).
 * Hand-traced for a stylised map; it is deliberately approximate (coast + the straight 129°E border).
 */
export const WA_OUTLINE = [
  [129.0, -14.9], [129.0, -26.0], [129.0, -31.7],
  // south coast, east → west
  [128.9, -31.7], [127.0, -32.2], [125.0, -32.8], [123.9, -33.6], [123.2, -33.9], [122.0, -33.9], [120.0, -33.95],
  [119.4, -34.4], [118.0, -35.0], [116.7, -35.0], [115.9, -34.4], [115.1, -34.35],
  // south-west & west coast, south → north
  [114.98, -33.65], [115.35, -33.65], [115.65, -33.3], [115.7, -32.5], [115.75, -32.05], [115.6, -31.5],
  [115.3, -31.0], [115.0, -30.5], [114.9, -29.25], [114.6, -28.8], [114.15, -27.7], [113.5, -26.9],
  [113.15, -26.15], [113.4, -25.4], [113.65, -24.9], [113.4, -23.0], [113.85, -22.3], [114.0, -21.8],
  [114.6, -21.85], [115.1, -21.65], [116.0, -21.05], [116.7, -20.6], [117.6, -20.7], [118.6, -20.3],
  [119.8, -20.0], [120.8, -19.8], [121.5, -19.2], [122.2, -18.0], [122.95, -16.5], [123.2, -16.9],
  [123.6, -17.3], [123.9, -17.0], [124.4, -16.3], [124.9, -15.9], [125.4, -15.1], [125.6, -14.3],
  // Kimberley coast
  [126.0, -14.1], [127.0, -13.8], [127.9, -14.2], [128.0, -14.9], [128.1, -15.5], [128.6, -15.2], [129.0, -14.9],
];

export const WA_BOUNDS = { lon: [112.9, 129.0], lat: [-35.1, -13.7], centre: [121.0, -24.4] };

/** ray-casting point-in-polygon test (lon/lat) */
export function insideWA(lon, lat) {
  let inside = false;
  for (let i = 0, j = WA_OUTLINE.length - 1; i < WA_OUTLINE.length; j = i++) {
    const [xi, yi] = WA_OUTLINE[i], [xj, yj] = WA_OUTLINE[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
