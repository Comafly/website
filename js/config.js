/**
 * Central, tweakable behaviour settings. Visual tokens live in scss/abstracts/_tokens.scss;
 * this file only holds *behavioural* knobs.
 */
export const config = {
  paths: {
    site: 'content/site.json',
    media: 'content/media.json',
    page: (file) => `content/pages/${file}.json`,
  },

  scroll: {
    /** Higher = snappier follow of the smoothed scroll value used by parallax/scrub effects. */
    smoothing: 14,
    /** px of downward scroll before the navbar compacts. */
    compactAfter: 48,
    /** px of upward scroll (any amount) that re-expands the navbar. */
    expandDelta: 3,
  },

  /** Toggle any effect off site-wide. */
  effects: {
    parallax: true,
    retype: true,
    wordfill: true,
    warp: true,
    cursor: true,
    magnetic: false,
    pageCurtain: true,
  },

  retype: {
    /** Glyphs shown while a character is "in flight" between the two fonts. */
    scramble: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/\\',
    /** Fraction of the progress range over which a single character settles. */
    settle: 0.34,
    /** How often (ms) in-flight glyphs change. */
    tick: 55,
  },

  hscroll: {
    /** Extra viewport-heights of scroll allowed after the last card (breathing room). */
    tail: 0.25,
    /** Viewports narrower than this (px) still pin; set higher to fall back to native swipe. */
    nativeBelow: 0,
  },

  warp: {
    /** Scroll velocity (px/s) above which images start to ripple. */
    threshold: 700,
    maxScale: 38,
  },

  media: {
    /** Widths used when building srcset for Unsplash-style URLs. */
    widths: [640, 960, 1440, 2000],
    /** Fallback chain when a photo 404s: seeded stock photo, then tinted gradient. */
    fallback: (id, w, h) => `https://picsum.photos/seed/${encodeURIComponent(id)}/${w}/${h}`,
  },

  storageKey: 'side.motion',
};
