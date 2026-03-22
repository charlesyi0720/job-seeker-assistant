/**
 * content/scrapers/linkedin-scraper.js
 * Extracts job data from LinkedIn job detail pages.
 * Handles both the legacy and newer "jobs-details-journey" UI patterns.
 */

/**
 * LinkedIn uses increasingly dynamic selectors.
 * These cover the 2024–2025 jobs-detail pages and legacy pages.
 */
const LI_SELECTORS_V2 = {
  title: [
    '.job-details-journey-top-card__job-title',
    '.t-24',
    'h1[class*="title"]',
    'h1[id*="job-title"]',
  ],
  company: [
    '.job-details-journey-top-card__company-name',
    '.app-aware-link',
    'a[href*="/company/"]',
    '[data-test-app-aware-link]',
  ],
  location: [
    '.job-details-journey-top-card__bullet-item:first-child',
    '.job-info__location',
    '[data-test-canonical-address]',
    'span[class*="location"]',
  ],
  description: [
    '.jobs-details-job-description__content',
    '#job-details',
    'div[id*="job-details"]',
    'div[data-test-job-description]',
  ],
  salary: [
    '.job-details-salary-snippet__salary-range',
    '.salary',
    'span[class*="salary"]',
  ],
  postedDate: [
    '.job-details-journey-top-card__posted-date',
    '.posted-time-ago__text',
    'span[class*="posted"]',
  ],
};

const LI_SELECTORS_LEGACY = {
  title: ['h1.top-card-layout__title', 'h1.t-24'],
  company: ['a.top-card-layout__anchor', '.topcard__org-name-link'],
  location: ['span.topcard__flavor--bullet'],
  description: ['#job-details', 'div.description'],
  salary: ['span.salary'],
  postedDate: ['time'],
};

/**
 * Check if the current page is a LinkedIn job detail page.
 * @returns {boolean}
 */
function isLinkedInJobPage() {
  const url = window.location.href;
  return (
    (url.includes('linkedin.com/jobs') || url.includes('jobs.linkedin.com')) &&
    /\/\d+\//.test(url)
  );
}

/**
 * @param {string[]} selectors
 * @returns {string|null}
 */
function queryFirst(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el.textContent || el.innerText || '').trim();
        if (text) return text;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * @param {string[]} selectors
 * @returns {string|null}
 */
function queryFirstHref(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el.getAttribute('href') || el.textContent.trim();
    } catch (_) {}
  }
  return null;
}

/**
 * @returns {string|null}
 */
function extractDescription() {
  for (const sel of [...LI_SELECTORS_V2.description, ...LI_SELECTORS_LEGACY.description]) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      el.querySelectorAll('script, style, iframe, button').forEach(e => e.remove());
      const text = (el.innerText || el.textContent || '').trim();
      if (text.length > 100) return text.replace(/\s+/g, ' ').trim();
    } catch (_) {}
  }
  return null;
}

/**
 * @returns {import('./scraper-manager.js').ScrapedJob | null}
 */
function scrapeLinkedIn() {
  if (!isLinkedInJobPage()) return null;

  // Prefer the new journey UI selectors
  const title = queryFirst(LI_SELECTORS_V2.title) ||
                queryFirst(LI_SELECTORS_LEGACY.title);

  if (!title) return null;

  const company = queryFirst(LI_SELECTORS_V2.company) ||
                  queryFirst(LI_SELECTORS_LEGACY.company);

  const location = queryFirst(LI_SELECTORS_V2.location) ||
                    queryFirst(LI_SELECTORS_LEGACY.location);

  const salary = queryFirst(LI_SELECTORS_V2.salary) ||
                 queryFirst(LI_SELECTORS_LEGACY.salary);

  const postedDate = queryFirst(LI_SELECTORS_V2.postedDate) ||
                     queryFirst(LI_SELECTORS_LEGACY.postedDate);

  const description = extractDescription();

  if (!description) {
    const generic = scrapeGeneric();
    if (generic && generic.description) {
      return {
        title: title.trim(),
        company: company ? company.trim() : generic.company || 'Unknown Company',
        location: location ? location.trim() : generic.location || 'Unknown Location',
        description: generic.description,
        salary: salary ? salary.trim() : null,
        postedDate: postedDate ? postedDate.trim() : null,
        url: window.location.href,
        platform: 'linkedin',
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
    platform: 'linkedin',
    confidence: 0.9,
  };
}
