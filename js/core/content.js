import { config } from '../config.js';

/**
 * Content layer. Every string on the site comes from JSON:
 *
 *   content/site.json          navigation, footer, UI strings, dialogs
 *   content/media.json         photo catalogue (id → url, alt text, focal point)
 *   content/pages/<slug>.json  one file per page
 *
 * Pages are linked to their content by ID: <body data-page="page.education"> is matched
 * against site.pages[].id, which names the JSON file.
 */

const cache = new Map();
async function getJSON(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url, { headers: { Accept: 'application/json' } }).then((r) => {
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(url);
}

export const content = {
  site: null,
  media: null,
  page: null,
  pageMeta: null,

  async init(pageId) {
    const [site, media] = await Promise.all([getJSON(config.paths.site), getJSON(config.paths.media)]);
    this.site = site;
    this.media = media.items;
    this.pageMeta = site.pages.find((p) => p.id === pageId);
    if (!this.pageMeta) throw new Error(`Unknown page id "${pageId}". Add it to content/site.json → pages.`);
    this.page = await getJSON(config.paths.page(this.pageMeta.file));
    return this;
  },

  /** Loads every page JSON (used by site search). */
  async allPages() {
    return Promise.all(this.site.pages.map(async (p) => ({ meta: p, data: await getJSON(config.paths.page(p.file)) })));
  },

  /** UI string by dot path, e.g. ui('nav.menu'). */
  ui(path, fallback = '') {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), this.site.ui) ?? fallback;
  },

  /** Media record by id. Always returns something renderable. */
  mediaItem(id) {
    return this.media[id] || { src: '', alt: '', w: 1600, h: 1000, tint: '#0c2a47' };
  },

  /**
   * Resolves link targets.
   *   "https://…" / "mailto:" / "tel:" / "#local"  → unchanged
   *   "page.enrolment#school-based-anchor"         → "enrolment.html#school-based-anchor"
   */
  href(target) {
    if (!target) return '#';
    if (/^(https?:|mailto:|tel:|#|\/|\.)/i.test(target)) return target;
    const [id, anchor] = target.split('#');
    const meta = this.site.pages.find((p) => p.id === id);
    if (!meta) return target;
    const here = meta.id === this.pageMeta?.id;
    return `${here && anchor ? '' : meta.href}${anchor ? `#${anchor}` : ''}`;
  },
};
