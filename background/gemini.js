/**
 * background/gemini.js
 * Gemini AI client for the Job Seeker BS Filter extension.
 *
 * SECURITY: All API calls go through the Vercel backend proxy (api/analyze-job.js).
 * The GEMINI_API_KEY lives only in Vercel environment variables — it never ships
 * in the extension or touches the user's browser.
 *
 * This file no longer calls generativelanguage.googleapis.com directly.
 */

import { getApiBaseUrl } from '../shared/storage.js';

// ─── Core API Call ─────────────────────────────────────────────────────────────

/**
 * Call the Vercel backend proxy, which forwards to Gemini server-side.
 *
 * @param {{ job: object, resume?: string, mode: 'analyze'|'reputation'|'coverletter', lang: string }} args
 * @returns {Promise<any>}
 */
async function callVercel({ job, resume, mode, lang }) {
  const base = await getApiBaseUrl();
  if (!base) {
    throw new Error(
      'API_BASE_URL_MISSING: Set VERCEL_API_BASE_DEFAULT in shared/constants.js to your Vercel deployment (must include api/analyze-job.js).'
    );
  }

  const url = `${base}/analyze-job`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job, resume, mode, lang }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let hint = '';
    if (response.status === 404) {
      hint =
        ' (404 usually means this URL is not the extension API project — deploy the GitHub repo that contains api/analyze-job.js to Vercel, set GEMINI_API_KEY there, then paste that site’s /api base URL in Settings.)';
    }
    throw new Error(`Vercel API error ${response.status}: ${errText}${hint}`);
  }

  const data = await response.json();

  if (data.error) throw new Error(data.error);

  return data.result;
}

// ─── Phase 2: Job Analysis ────────────────────────────────────────────────────

/**
 * Phase 2 — Full job description analysis.
 * Returns fluff score, buzzwords, red flags, real requirements, and AI risk index.
 *
 * @param {{ title: string, company: string|null, description: string }} job
 * @param {'en'|'zh'} lang
 * @returns {Promise<object>}
 */
export async function analyzeJob(job, lang = 'en') {
  return callVercel({ job, mode: 'analyze', lang });
}

// ─── Phase 2: Company Reputation ──────────────────────────────────────────────

/**
 * Phase 2 — Fetch aggregated company reputation (praise/complaint) from Gemini.
 * Uses Gemini's training knowledge; no web search required.
 *
 * @param {string} company
 * @param {'en'|'zh'} lang
 * @returns {Promise<{ positive: string, negative: string }>}
 */
export async function fetchCompanyReputation(company, lang = 'en') {
  return callVercel({ job: { company }, mode: 'reputation', lang });
}

// ─── Phase 3: Cover Letter Generator ──────────────────────────────────────────

/**
 * Phase 3 — Generate a tailored cover letter from a job description and resume.
 *
 * @param {{ title: string, company: string|null, description: string }} job
 * @param {string} resume
 * @param {'en'|'zh'} lang
 * @returns {Promise<string>} — plain text cover letter
 */
export async function generateTailoredCoverLetter(job, resume, lang = 'en') {
  if (!resume || !resume.trim()) {
    throw new Error('RESUME_NOT_PROVIDED');
  }
  return callVercel({ job, resume, mode: 'coverletter', lang });
}
