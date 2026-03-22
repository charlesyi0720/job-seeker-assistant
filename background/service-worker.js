/**
 * background/service-worker.js
 * Extension service worker — handles all long-lived background logic:
 *   - Receives scraped jobs from content scripts
 *   - Calls Gemini API for analysis
 *   - Saves to Supabase
 *   - Manages side panel and language state
 */

import { MESSAGE_TYPES } from '../shared/constants.js';
import { setLanguage as saveLanguage } from '../shared/i18n.js';
import { analyzeJob } from './gemini.js';
import { saveJobToHistory, loadJobHistory, clearHistory } from './supabase-client.js';
import {
  setCurrentJob,
  setLastAnalysis,
  getCurrentJob,
  getLastAnalysis,
} from '../shared/storage.js';

// ─── Message Router ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => {
      console.error('[JSE ServiceWorker] Message handler error:', err);
      sendResponse({ error: err.message });
    });

  // Return true to indicate async response
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case MESSAGE_TYPES.SCRAPE_COMPLETE:
      return handleScrapeComplete(message.payload);

    case MESSAGE_TYPES.ANALYZE_JOB:
      return handleAnalyzeJob(message.payload);

    case MESSAGE_TYPES.SAVE_TO_HISTORY:
      return handleSaveToHistory(message.payload);

    case MESSAGE_TYPES.LOAD_HISTORY:
      return handleLoadHistory(message.payload);

    case MESSAGE_TYPES.SET_LANGUAGE:
      return handleSetLanguage(message.payload);

    case MESSAGE_TYPES.OPEN_SIDEPANEL:
      return handleOpenSidePanel();

    case MESSAGE_TYPES.GENERATE_COVER_LETTER:
      return handleGenerateCoverLetter(message.payload);

    case MESSAGE_TYPES.FETCH_REPUTATION:
      return handleFetchReputation(message.payload);

    case MESSAGE_TYPES.GET_CURRENT_JOB:
      return { job: await getCurrentJob(), analysis: await getLastAnalysis() };

    default:
      return { error: `Unknown message type: ${message.type}` };
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Triggered when a content script finishes scraping a job.
 * Stores the job and kicks off Gemini analysis automatically via Vercel.
 */
async function handleScrapeComplete(job) {
  await setCurrentJob(job);

  try {
    const lang = detectLanguageFromText(job.description);
    const analysis = await analyzeJob(job, lang);
    await setLastAnalysis(analysis);
    // Broadcast to side panel
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.JOB_ANALYZED,
      payload: { job, analysis },
    }).catch(() => {});
    return { status: 'scraped_and_analyzed', job, analysis };
  } catch (err) {
    console.warn('[JSE] Auto-analysis failed:', err.message);
    return { status: 'scraped', job };
  }
}

/**
 * Manually triggered analysis (e.g. user clicks "Re-analyze").
 */
async function handleAnalyzeJob({ job, lang }) {
  const analysis = await analyzeJob(job, lang || 'en');
  await setLastAnalysis(analysis);
  return { analysis };
}

/**
 * Save a job + optional analysis to Supabase / local storage.
 */
async function handleSaveToHistory({ job, analysis }) {
  const result = await saveJobToHistory(job, analysis || null);
  return result;
}

/**
 * Load recent job history.
 */
async function handleLoadHistory({ limit }) {
  const history = await loadJobHistory(limit || 10);
  return { history };
}

/**
 * Set the session language override.
 */
async function handleSetLanguage({ lang }) {
  await saveLanguage(lang);
  return { lang };
}

/**
 * Open the Chrome side panel.
 */
async function handleOpenSidePanel() {
  try {
    await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  } catch (err) {
    console.warn('[JSE ServiceWorker] Could not open side panel:', err.message);
    // Fall back to opening the extension popup
    await chrome.action.openPopup().catch(() => {});
  }
  return { status: 'ok' };
}

/**
 * Phase 3 — Generate a tailored cover letter.
 */
async function handleGenerateCoverLetter({ job, resume, lang }) {
  const { generateTailoredCoverLetter } = await import('./gemini.js');
  const letter = await generateTailoredCoverLetter(job, resume, lang || 'en');
  return { letter };
}

/**
 * Phase 2 — Fetch company reputation (praise/complaint).
 */
async function handleFetchReputation({ company, lang }) {
  const { fetchCompanyReputation } = await import('./gemini.js');
  const sentiment = await fetchCompanyReputation(company, lang || 'en');
  return { sentiment };
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Detect language from job description text.
 * @param {string} text
 * @returns {'en' | 'zh'}
 */
function detectLanguageFromText(text) {
  if (!text) return 'en';
  const cjk = /[\u4e00-\u9fff]/;
  return cjk.test(text) ? 'zh' : 'en';
}

// ─── Extension Lifecycle ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.info('[JSE] Job Seeker BS Filter installed.');
});
