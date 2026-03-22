/**
 * content/content-globals.js
 * Shared globals for all content scripts. MUST stay free of import/export
 * (Chrome MV3 content scripts are classic scripts).
 *
 * Keep values in sync with shared/constants.js.
 */

var PLATFORM_HOSTNAMES = {
  SEEK: 'seek.com.au',
  SEEK_CAREERS: 'seek.co.nz',
  LINKEDIN: 'linkedin.com',
  LINKEDIN_JOBS: 'jobs.linkedin.com',
  JORA: 'jora.com',
  JORA_AU: 'au.jora.com',
};

var MESSAGE_TYPES = {
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

var OVERLAY_ROOT_ID = 'jse-overlay-root';
var FAB_BUTTON_ID = 'jse-fab-button';
