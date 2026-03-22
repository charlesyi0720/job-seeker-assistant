/**
 * content/content-entry.js
 * Content script entry point.
 * Sets up MutationObserver for SPAs, runs scraper, sends data to service worker.
 */

/** Debounce helper to avoid re-scraping on rapid DOM mutations */
function debounce(fn, delay = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Send scraped job to the service worker for analysis */
async function sendToServiceWorker(job) {
  if (!job || !job.description) return;

  try {
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.SCRAPE_COMPLETE, payload: job },
      () => {
        if (chrome.runtime.lastError) {
          console.warn('[JSE] Service worker unreachable:', chrome.runtime.lastError.message);
        }
      }
    );
  } catch (err) {
    console.warn('[JSE] Failed to send job to service worker:', err);
  }
}

/** Run the scraper and dispatch results */
function runScraper() {
  const job = scrapeCurrentPage();
  if (job) {
    sendToServiceWorker(job);
    // Notify the side panel / overlay if they need to refresh
    window.postMessage({ type: 'JSE_JOB_SCRAPED', payload: job }, '*');
  }
  return job;
}

/** MutationObserver callback — re-run on SPA navigation */
const onMutation = debounce(() => {
  const job = runScraper();
  if (job) {
    // Trigger overlay update
    window.postMessage({ type: 'JSE_JOB_UPDATED', payload: job }, '*');
  }
}, 800);

/** Listen for messages from the overlay / side panel */
window.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'JSE_GET_JOB') {
    const job = scrapeCurrentPage();
    if (job) {
      window.postMessage({ type: 'JSE_JOB_RESPONSE', payload: job }, '*');
    }
  }
  if (event.data.type === 'JSE_SET_LANGUAGE') {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SET_LANGUAGE,
      payload: { lang: event.data.payload },
    });
  }
  if (event.data.type === 'JSE_OPEN_SIDEPANEL') {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDEPANEL });
  }
  if (event.data.type === 'JSE_SAVE_HISTORY') {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_TO_HISTORY,
      payload: event.data.payload,
    });
  }
});

/** Inject the Tailwind overlay shell once */
function ensureOverlayRoot() {
  if (document.getElementById(OVERLAY_ROOT_ID)) return;
  const root = document.createElement('div');
  root.id = OVERLAY_ROOT_ID;
  root.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: none;
  `;
  document.body.appendChild(root);
}

/** Show a floating FAB button to trigger analysis when side panel is hidden */
function showFloatingFab(jobFound) {
  let fab = document.getElementById(FAB_BUTTON_ID);
  if (!fab) {
    fab = document.createElement('button');
    fab.id = FAB_BUTTON_ID;
    fab.title = 'Job Seeker BS Filter';
    fab.style.cssText = `
      pointer-events: all;
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483646;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      font-size: 22px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    fab.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDEPANEL });
    });
    fab.addEventListener('mouseenter', () => {
      fab.style.transform = 'scale(1.1)';
    });
    fab.addEventListener('mouseleave', () => {
      fab.style.transform = 'scale(1)';
    });
    document.body.appendChild(fab);
  }
  fab.style.display = jobFound ? 'flex' : 'none';
}

/** Initialise everything */
function init() {
  ensureOverlayRoot();
  initInjector();

  // Give the page a moment to settle (SPAs often render late)
  const initialJob = runScraper();
  showFloatingFab(!!initialJob);

  // Watch for SPA route changes
  const observer = new MutationObserver(onMutation);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also listen for URL changes (pushState navigation)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      onMutation();
    }
  });
  urlObserver.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['href'] });
}

// Run on DOMContentLoaded or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
