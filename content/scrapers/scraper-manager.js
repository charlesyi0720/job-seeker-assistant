/**
 * content/scrapers/scraper-manager.js
 * Routes hostname to the correct scraper; falls back to generic.
 */

import { PLATFORM_HOSTNAMES } from '../../shared/constants.js';
import { scrapeSeek } from './seek-scraper.js';
import { scrapeLinkedIn } from './linkedin-scraper.js';
import { scrapeGeneric } from './generic-scraper.js';

/**
 * @typedef {Object} ScrapedJob
 * @property {string} title
 * @property {string} company
 * @property {string} location
 * @property {string} description   — plain text
 * @property {string|null} salary
 * @property {string|null} postedDate
 * @property {string} url
 * @property {string} platform      — 'seek' | 'linkedin' | 'generic'
 * @property {number} confidence    — 0–1 how confident the scraper is
 */

/** @returns {ScrapedJob|null} */
function detectAndScrape() {
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.includes(PLATFORM_HOSTNAMES.SEEK)) {
    return scrapeSeek();
  }

  if (hostname.includes(PLATFORM_HOSTNAMES.LINKEDIN)) {
    return scrapeLinkedIn();
  }

  // All other sites
  return scrapeGeneric();
}

/**
 * Public entry point — called by content-entry.js.
 * @returns {ScrapedJob|null}
 */
export function scrapeCurrentPage() {
  try {
    const result = detectAndScrape();
    if (result && result.title) {
      result.url = window.location.href;
      return result;
    }
    return null;
  } catch (err) {
    console.warn('[JSE ScraperManager] Scraping failed:', err);
    return null;
  }
}
