import { config } from '../config.js';

/**
 * Image resilience: photos come from external URLs listed in content/media.json. If one fails,
 * try a seeded stock photo; if that fails, fall back to the tinted placeholder (.is-broken).
 */
export function initImages() {
  const onError = (img) => {
    if (!img.dataset.media) return;
    if (!img.dataset.fallbackStage) {
      img.dataset.fallbackStage = '1';
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = config.media.fallback(img.dataset.media, img.getAttribute('width') || 1600, img.getAttribute('height') || 1000);
    } else {
      img.classList.add('is-broken');
      img.closest('.ph')?.classList.add('is-broken');
    }
  };
  document.addEventListener('error', (e) => { if (e.target instanceof HTMLImageElement) onError(e.target); }, true);
  document.addEventListener('load', (e) => { if (e.target instanceof HTMLImageElement) e.target.classList.add('is-loaded'); }, true);
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete) (img.naturalWidth ? img.classList.add('is-loaded') : onError(img));
  });
}
