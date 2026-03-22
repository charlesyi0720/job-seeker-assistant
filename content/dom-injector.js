/**
 * content/dom-injector.js
 * Injects Tailwind CSS via CDN, custom styles, and registers the overlay shell.
 * Runs once per page load.
 */

/**
 * Inject a <style> tag into <head>.
 * @param {Record<string,string>} attrs
 * @param {string} innerText
 */
function injectHead(attrs, innerText) {
  if (document.querySelector(`[data-jse-injected="${attrs['data-jse-injected'] || ''}"]`)) return;
  const el = document.createElement('style');
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (innerText) el.textContent = innerText;
  document.head.appendChild(el);
}

/** Inject minimal self-contained CSS — no external CDN needed */
function injectCustomCSS() {
  injectHead({
    'data-jse-injected': 'jse-custom-css',
  }, `
    #${OVERLAY_ROOT_ID} *, #${OVERLAY_ROOT_ID} *::before, #${OVERLAY_ROOT_ID} *::after {
      box-sizing: border-box;
    }
    #${OVERLAY_ROOT_ID} {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .jse-toast {
      position: fixed;
      bottom: 88px;
      right: 24px;
      z-index: 2147483647;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: white;
      background: #10b981;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      pointer-events: none;
      animation: jse-toast-in 0.25s ease-out;
    }
    .jse-toast.error { background: #ef4444; }
    @keyframes jse-toast-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes jse-toast-out {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-8px); }
    }
  `);
}

/**
 * Show a temporary toast notification.
 * @param {string} message
 * @param {'success'|'error'} [type]
 * @param {number} [duration=2500]
 */
function showToast(message, type = 'success', duration = 2500) {
  const existing = document.querySelector('.jse-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'jse-toast' + (type === 'error' ? ' error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function() {
    toast.style.animation = 'jse-toast-out 0.2s ease-in forwards';
    setTimeout(function() { toast.remove(); }, 200);
  }, duration);
}

/** Main initialisation — call once from content-entry.js */
function initInjector() {
  injectCustomCSS();
}
