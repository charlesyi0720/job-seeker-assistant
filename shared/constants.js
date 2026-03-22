/**
 * shared/constants.js
 * Global constants for the Job Seeker BS Filter extension.
 *
 * NOTE: This file is a true ESM module used by:
 *   - background/service-worker.js  (manifest: "type": "module")
 *   - popup/popup.js               (script type="module" in HTML)
 *   - sidepanel/sidepanel.js       (script type="module" in HTML)
 *   - content scripts              use content/content-globals.js (classic
 *     script, duplicated subset — no import/export in content world)
 *
 * Do NOT list this file in manifest.json content_scripts directly, as
 * content scripts do not support import/export syntax.
 */

// ── Vercel Backend ──────────────────────────────────────────────────────────────
// Set your real base URL in extension Settings (chrome.storage), or use this default.
// IMPORTANT: Must be a deployment that includes THIS repo's `api/analyze-job.js`
// (a generic Flutter / Next app on the same name will NOT expose /api/analyze-job).
// Examples: https://your-api-project.vercel.app/api  |  http://localhost:3000/api
export const VERCEL_API_BASE_DEFAULT = '';

/** @deprecated use VERCEL_API_BASE_DEFAULT + storage override; kept for older imports */
export const VERCEL_API_BASE = VERCEL_API_BASE_DEFAULT;

export const PLATFORM_HOSTNAMES = {
  SEEK: 'seek.com.au',
  SEEK_CAREERS: 'seek.co.nz',
  LINKEDIN: 'linkedin.com',
  LINKEDIN_JOBS: 'jobs.linkedin.com',
  JORA: 'jora.com',
  JORA_AU: 'au.jora.com',
};

export const GEMINI_CONFIG = {
  MODEL: 'gemini-3.1-flash-lite',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
  MAX_TOKENS: 1200,
  TEMPERATURE: 0.2,
};

export const STORAGE_KEYS = {
  // NOTE: GEMINI_API_KEY is no longer stored in the extension.
  // It is set as an environment variable in the Vercel dashboard.
  /** User override: e.g. https://xxx.vercel.app/api (no trailing slash after /api) */
  API_BASE_URL: 'api_base_url',
  SUPABASE_URL: 'supabase_url',
  SUPABASE_ANON_KEY: 'supabase_anon_key',
  LANGUAGE_PREF: 'language_pref',
  RESUME_TEXT: 'resume_text',
  CURRENT_JOB: 'current_job',
  LAST_ANALYSIS: 'last_analysis',
  LOCAL_HISTORY: 'local_history',
  SESSION_LANG: 'session_lang',
};

export const LANGUAGE_PREF = {
  AUTO: 'auto',
  EN: 'en',
  ZH: 'zh',
};

export const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const BUZZWORD_CATEGORIES = {
  ROLE_AMBIGUITY: 'role_ambiguity',
  CULTURE_VAGUENESS: 'culture_vagueness',
  AI_WFH_OBFUSCATION: 'ai_wfh_obfuscation',
  COMPENSATION_VAGUE: 'compensation_vague',
  REQUIREMENTS_WASHING: 'requirements_washing',
  AI_RISK_INDEX: 'ai_risk_index',
};

export const MESSAGE_TYPES = {
  ANALYZE_JOB: 'ANALYZE_JOB',
  JOB_ANALYZED: 'JOB_ANALYZED',
  ANALYZER_ERROR: 'ANALYZER_ERROR',
  SCRAPE_COMPLETE: 'SCRAPE_COMPLETE',
  SAVE_TO_HISTORY: 'SAVE_TO_HISTORY',
  HISTORY_SAVED: 'HISTORY_SAVED',
  LOAD_HISTORY: 'LOAD_HISTORY',
  HISTORY_LOADED: 'HISTORY_LOADED',
  GET_CURRENT_JOB: 'GET_CURRENT_JOB',
  SET_LANGUAGE: 'SET_LANGUAGE',
  OPEN_SIDEPANEL: 'OPEN_SIDEPANEL',
  DISMISS_PANEL: 'DISMISS_PANEL',
  GENERATE_COVER_LETTER: 'GENERATE_COVER_LETTER',
  COVER_LETTER_GENERATED: 'COVER_LETTER_GENERATED',
  FETCH_REPUTATION: 'FETCH_REPUTATION',
  REPUTATION_FETCHED: 'REPUTATION_FETCHED',
};

export const SIDEPANEL_ID = 'jse-sidepanel-root';
export const OVERLAY_ROOT_ID = 'jse-overlay-root';
export const FAB_BUTTON_ID = 'jse-fab-button';

export const SCORE_THRESHOLDS = {
  LOW: 40,
  HIGH: 70,
};

export const HISTORY_LIMIT = 50;
export const RESUME_PREVIEW_LENGTH = 200;
