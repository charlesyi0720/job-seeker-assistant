/**
 * shared/constants.js
 * Global constants for the Job Seeker BS Filter extension.
 */

// ── Vercel Backend ──────────────────────────────────────────────────────────────
// During local dev: http://localhost:3000/api
// After deploying to Vercel, replace with your actual URL e.g.:
//   https://job-seeker-assistant.vercel.app/api
export const VERCEL_API_BASE = 'https://job-seeker-assistant.vercel.app/api';

export const PLATFORM_HOSTNAMES = {
  SEEK: 'seek.com.au',
  SEEK_CAREERS: 'seek.co.nz',
  LINKEDIN: 'linkedin.com',
  LINKEDIN_JOBS: 'jobs.linkedin.com',
  JORA: 'jora.com',
  JORA_AU: 'au.jora.com',
};

export const GEMINI_CONFIG = {
  MODEL: 'gemini-1.5-pro',
  // Kept for reference only — actual calls go through the Vercel proxy.
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
  MAX_TOKENS: 1200,
  TEMPERATURE: 0.2,
};

export const STORAGE_KEYS = {
  // NOTE: GEMINI_API_KEY is no longer stored in the extension.
  // It is set as an environment variable in the Vercel dashboard.
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
