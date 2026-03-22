/**
 * content/scrapers/generic-scraper.js
 * Platform-agnostic fallback scraper for corporate sites, Greenhouse, Workday, etc.
 * Uses heuristics to find common job listing elements.
 */

/**
 * @typedef {Object} GenericCandidate
 * @property {string} selector
 * @property {string} field
 * @property {number} weight  — higher = more likely to be correct
 */

/** Ordered list of candidate selectors per field */
const CANDIDATES = [
  // Title — most important
  { selector: 'h1[data-qa="job-title"]', field: 'title', weight: 10 },
  { selector: 'h1.job-title', field: 'title', weight: 9 },
  { selector: 'h1[class*="job-title"]', field: 'title', weight: 9 },
  { selector: 'h1[class*="jobtitle"]', field: 'title', weight: 9 },
  { selector: 'h1[class*="postingTitle"]', field: 'title', weight: 9 },
  { selector: 'h1[class*="jobTitle"]', field: 'title', weight: 9 },
  { selector: 'h1[id*="job-title"]', field: 'title', weight: 8 },
  { selector: '.job-title', field: 'title', weight: 7 },
  { selector: 'h1', field: 'title', weight: 3 },

  // Company
  { selector: '[data-qa="company-name"]', field: 'company', weight: 10 },
  { selector: 'a[data-qa="company-name"]', field: 'company', weight: 10 },
  { selector: '.company-name', field: 'company', weight: 8 },
  { selector: '[class*="company-name"]', field: 'company', weight: 8 },
  { selector: '[class*="companyName"]', field: 'company', weight: 8 },
  { selector: '[data-testid="company-name"]', field: 'company', weight: 9 },
  { selector: 'a[href*="/company/"]', field: 'company', weight: 6 },
  { selector: 'a[class*="employer"]', field: 'company', weight: 6 },

  // Location
  { selector: '[data-qa="location"]', field: 'location', weight: 10 },
  { selector: '.location', field: 'location', weight: 7 },
  { selector: '[class*="location"]', field: 'location', weight: 6 },
  { selector: '[class*="Location"]', field: 'location', weight: 6 },
  { selector: '[data-testid="location"]', field: 'location', weight: 9 },
  { selector: 'span[class*="city"]', field: 'location', weight: 4 },

  // Description
  { selector: '#job-description', field: 'description', weight: 10 },
  { selector: '#description', field: 'description', weight: 9 },
  { selector: '.job-description', field: 'description', weight: 8 },
  { selector: '[class*="job-description"]', field: 'description', weight: 8 },
  { selector: '[data-qa="job-description"]', field: 'description', weight: 10 },
  { selector: '[data-testid="job-description"]', field: 'description', weight: 10 },
  { selector: 'article', field: 'description', weight: 6 },
  { selector: 'section[class*="description"]', field: 'description', weight: 7 },
  { selector: 'div[class*="description"]', field: 'description', weight: 6 },

  // Salary
  { selector: '[data-qa="salary"]', field: 'salary', weight: 10 },
  { selector: '.salary', field: 'salary', weight: 8 },
  { selector: '[class*="salary"]', field: 'salary', weight: 7 },
  { selector: '[class*="Salary"]', field: 'salary', weight: 7 },
  { selector: 'span[class*="compensation"]', field: 'salary', weight: 6 },

  // Posted date
  { selector: '[data-qa="posted-date"]', field: 'postedDate', weight: 10 },
  { selector: '[class*="posted-date"]', field: 'postedDate', weight: 8 },
  { selector: 'time', field: 'postedDate', weight: 5 },
  { selector: '[class*="posted"]', field: 'postedDate', weight: 5 },
  { selector: 'span[class*="date"]', field: 'postedDate', weight: 4 },
];

/**
 * Extract text from an element, stripping HTML.
 * @param {Element} el
 * @returns {string}
 */
function cleanText(el) {
  el.querySelectorAll('script, style, iframe, noscript, button').forEach(e => e.remove());
  return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * @returns {Object | null} Scraped job or null
 */
function scrapeGeneric() {
  const results = {};

  for (const { selector, field, weight } of CANDIDATES) {
    if (results[field]) continue; // Already found
    try {
      const el = document.querySelector(selector);
      if (!el) continue;
      const text = cleanText(el);
      if (!text || text.length < 2) continue;

      // Title should not be too short or too long
      if (field === 'title' && (text.length < 5 || text.length > 200)) continue;

      // Description must be substantial
      if (field === 'description' && text.length < 100) continue;

      // Avoid matching nav/footer elements
      const inMainContent =
        el.closest('main') ||
        el.closest('article') ||
        el.closest('[role="main"]') ||
        el.closest('#content') ||
        el.closest('.content') ||
        !el.closest('nav');

      results[field] = {
        value: text,
        weight,
        isMainContent: inMainContent,
      };
    } catch (_) {}
  }

  // Also check meta tags for description fallback
  if (!results.description) {
    const metaDesc = document.querySelector(
      'meta[name="description"][content], meta[property="og:description"][content]'
    );
    if (metaDesc) {
      const content = metaDesc.getAttribute('content');
      if (content && content.length > 100) {
        results.description = { value: content.replace(/\s+/g, ' ').trim(), weight: 2 };
      }
    }
  }

  const description = results.description?.value || null;
  if (!description) return null; // Cannot proceed without a description

  // Calculate weighted confidence
  let totalWeight = 0;
  let matchedWeight = 0;
  for (const field of ['title', 'company', 'location', 'description', 'salary', 'postedDate']) {
    totalWeight += CANDIDATES.filter(c => c.field === field).reduce((s, c) => s + c.weight, 0);
    if (results[field]) matchedWeight += results[field].weight;
  }
  const confidence = Math.min(matchedWeight / (totalWeight / 4), 1);

  return {
    title: results.title?.value || 'Unknown Position',
    company: results.company?.value || null,
    location: results.location?.value || null,
    description,
    salary: results.salary?.value || null,
    postedDate: results.postedDate?.value || null,
    url: window.location.href,
    platform: 'generic',
    confidence,
  };
}
