/**
 * content/scrapers/seek-scraper.js
 * Extracts job data from seek.com.au job detail pages.
 */

import { scrapeGeneric } from './generic-scraper.js';

/**
 * SEEK-specific selectors.
 * These use data-automation attributes which are stable.
 */
const SEEK_SELECTORS = {
  title: [
    'h1[data-automation="job-detail-title"]',
    'h1[class*="job-detail"]',
    'h1.temporary__text--bold',
  ],
  company: [
    'a[data-automation="job-detail-company-name"]',
    '[data-automation="job-detail-company-name"]',
    'a[class*="company-name"]',
  ],
  location: [
    'span[data-automation="job-detail-location"]',
    '[data-automation="job-detail-location"]',
    'span[class*="location"]',
  ],
  description: [
    'article[data-automation="job-details"]',
    '[data-automation="job-details"]',
    'div[class*="job-details"]',
    '#job-details',
  ],
  salary: [
    'span[data-automation="job-detail-salary"]',
    '[data-automation="job-detail-salary"]',
    'span[class*="salary"]',
  ],
  postedDate: [
    'span[data-automation="job-detail-date"]',
    '[data-automation="job-detail-date"]',
    'span[class*="date"]',
    'span[class*="posted"]',
  ],
};

/**
 * Check if the current page looks like a SEEK job detail page.
 * @returns {boolean}
 */
function isSeekJobPage() {
  const url = window.location.href;
  // SEEK job detail URLs contain /job/ and a numeric ID
  return /seek\.com\.au\/job\//.test(url) && url.includes('/job/');
}

/**
 * Query a selector array, return first matching element's text.
 * @param {string[]} selectors
 * @param {boolean} [asHtml=false]
 * @returns {string|null}
 */
function queryFirst(selectors, asHtml = false) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        return asHtml ? el.innerHTML : (el.textContent || el.innerText || '').trim();
      }
    } catch (_) {
      // Invalid selector — skip
    }
  }
  return null;
}

/**
 * Extract plain text from the job description element,
 * stripping HTML tags and normalising whitespace.
 * @returns {string|null}
 */
function extractDescription() {
  for (const sel of SEEK_SELECTORS.description) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      // Remove nested script/style/iframe elements
      el.querySelectorAll('script, style, iframe, noscript').forEach(e => e.remove());
      const text = el.innerText || el.textContent || '';
      if (text.trim().length > 100) {
        return text.replace(/\s+/g, ' ').trim();
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Main SEEK scraper function.
 * Falls back to generic scraper if page doesn't look like a SEEK job.
 * @returns {import('./scraper-manager.js').ScrapedJob | null}
 */
export function scrapeSeek() {
  if (!isSeekJobPage()) {
    return null;
  }

  const title = queryFirst(SEEK_SELECTORS.title);
  if (!title) {
    // Not a valid SEEK job detail page
    return null;
  }

  const company = queryFirst(SEEK_SELECTORS.company);
  const location = queryFirst(SEEK_SELECTORS.location);
  const salary = queryFirst(SEEK_SELECTORS.salary);
  const postedDate = queryFirst(SEEK_SELECTORS.postedDate);
  const description = extractDescription();

  // Confidence: higher if description was found
  const confidence = description ? 0.95 : 0.5;

  if (!description) {
    // Try generic as a fallback for the description at least
    const generic = scrapeGeneric();
    if (generic && generic.description) {
      return {
        title,
        company: company || generic.company || 'Unknown Company',
        location: location || generic.location || 'Unknown Location',
        description: generic.description,
        salary,
        postedDate,
        url: window.location.href,
        platform: 'seek',
        confidence: 0.6,
      };
    }
    return null;
  }

  return {
    title: title.trim(),
    company: company ? company.trim() : null,
    location: location ? location.trim() : null,
    description,
    salary: salary ? salary.trim() : null,
    postedDate: postedDate ? postedDate.trim() : null,
    url: window.location.href,
    platform: 'seek',
    confidence,
  };
}
