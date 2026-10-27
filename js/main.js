import { $, h } from './core/dom.js';
import { content } from './core/content.js';
import { motion } from './core/motion.js';
import { startTicker, measureAll } from './core/ticker.js';
import { ready, markReady } from './core/ready.js';
import { renderSections, auditDocument } from './render/index.js';
import { skipLink, buildHeader, buildFooter, buildDialogs, buildProgress } from './render/shell.js';
import { initImages } from './fx/images.js';
import { initReveal } from './fx/reveal.js';
import { initWordfill } from './fx/wordfill.js';
import { initParallax } from './fx/parallax.js';
import { initSequences } from './fx/sequence.js';
import { initBooks } from './fx/book.js';
import { initStages } from './fx/hstage.js';
import { initPaint } from './fx/paint.js';
import { initHScroll } from './fx/hscroll.js';
import { initBanners } from './fx/banner.js';
import { initMarquees } from './fx/marquee.js';
import { initFlow } from './fx/flow.js';
import { initCounters } from './fx/counters.js';
import { initButtons } from './fx/buttons.js';
import { initCurtain } from './fx/curtain.js';
import { initAnchors, goTo } from './fx/anchors.js';
import { initProgress } from './fx/progress.js';
import { initHeader } from './ui/header.js';
import { initDialogs } from './ui/dialogs.js';
import { initStories } from './ui/stories.js';
import { initSpotlights } from './fx/spotlight.js';
import { initSettle } from './fx/settle.js';
import { initMaps } from './fx/map.js';
import { initHeroCycle } from './fx/herocycle.js';
import { initSearch } from './ui/search.js';
import { initTabs } from './ui/tabs.js';
import { initAccordions } from './ui/accordion.js';
import { initPickers } from './ui/picker.js';
import { initForms } from './ui/forms.js';
import { initFooter } from './ui/footer.js';

/**
 * Boot sequence. HTML files are thin shells (<body data-page="page.xxx">); everything on screen
 * is built from JSON and then enhanced by the modules above.
 */
async function boot() {
  const pageId = document.body.dataset.page;
  try {
    await content.init(pageId);
  } catch (err) {
    console.error(err);
    document.body.classList.remove('is-loading');
    document.querySelector('#main').textContent = `Content failed to load (${err.message}). Serve this folder over HTTP — see README.`;
    return;
  }
  const { page, site } = content;
  document.documentElement.lang = site.lang || 'en-AU';
  document.title = `${page.meta.title} · ${site.brand.name}`;
  $('meta[name="description"]')?.setAttribute('content', page.meta.description || '');

  // Landmarks already exist in the HTML shell; fill them.
  document.body.prepend(skipLink());
  $('#site-header').append(...buildHeader());
  const main = $('#main');
  main.setAttribute('tabindex', '-1');
  renderSections(page.sections, main);
  $('#site-footer').append(...buildFooter());
  document.body.append(...buildDialogs(), buildProgress());

  // Behaviour
  initImages();
  startTicker();
  initTabs();
  initAccordions();
  initPickers();
  initForms();
  initReveal();
  initWordfill();
  initParallax();
  initSequences();
  initBooks();
  initStages();
  initPaint();
  initHScroll();
  initBanners();
  initMarquees();
  if (page.meta.flow) initFlow();
  initCounters();
  initButtons(document);
  initCurtain();
  initAnchors();
  initProgress();
  initHeader();
  initDialogs();
  initStories();
  initSpotlights();
  initHeroCycle();
  initMaps();
  initSettle();
  initSearch();
  initFooter();

  measureAll();
  auditDocument();

  // Wait for type + first paint so the entrance is smooth, but never block for long.
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1600))]);
  measureAll();
  document.body.classList.remove('is-loading');
  markReady();

  if (location.hash) requestAnimationFrame(() => { measureAll(); goTo(location.hash, { instant: true, push: false }); });
}

boot();
