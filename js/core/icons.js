import { svg } from './dom.js';

const P = (d, extra = '') => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

const ICONS = {
  arrow: P('<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>'),
  arrowLeft: P('<path d="M20 12H5"/><path d="m11 6-6 6 6 6"/>'),
  arrowUp: P('<path d="M12 20V5"/><path d="m6 11 6-6 6 6"/>'),
  arrowDown: P('<path d="M12 4v15"/><path d="m6 13 6 6 6-6"/>'),
  search: P('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>'),
  phone: P('<path d="M5 4h3.5l1.7 4.4-2.3 1.4a11 11 0 0 0 5.3 5.3l1.4-2.3L19 14.5V18a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2Z"/>'),
  mail: P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  menu: P('<path d="M4 8h16"/><path d="M4 16h16"/>'),
  close: P('<path d="m6 6 12 12"/><path d="m18 6-12 12"/>'),
  plus: P('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  minus: P('<path d="M5 12h14"/>'),
  external: P('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  download: P('<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>'),
  doc: P('<path d="M7 3h7l5 5v13H7Z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>'),
  left: P('<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>'),
  right: P('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>'),
  alert: P('<path d="M12 3 2.5 20h19Z"/><path d="M12 10v5"/><path d="M12 17.5v.01"/>'),
  calendar: P('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  check: P('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  pin: P('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  motion: P('<path d="M3 12h4l3-7 4 14 3-7h4"/>'),
};

export const icon = (name, cls = 'icon') => svg(ICONS[name] || ICONS.arrow, cls);
export const iconMarkup = (name) => ICONS[name] || ICONS.arrow;

/** Brand mark: signal arcs radiating from a point — "learning anywhere". Swap for your official logo here. */
export const brandMark = () => svg(`<svg viewBox="0 0 48 48" width="1em" height="1em"><rect x="1.5" y="1.5" width="45" height="45" rx="15" fill="currentColor"/><g fill="none" stroke="var(--logo-ink, #06192b)" stroke-width="3.2" stroke-linecap="round"><path d="M13 35a7 7 0 0 1 7-7"/><path d="M13 27a15 15 0 0 1 15-15"/><path d="M13 19.5A22.5 22.5 0 0 1 35.5 12"/></g><circle cx="14" cy="34" r="3" fill="var(--logo-ink, #06192b)"/></svg>`, 'brand__mark');
