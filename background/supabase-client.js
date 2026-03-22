/**
 * background/supabase-client.js
 * Supabase client for persisting job history and analysis results.
 * Uses anon key in the browser context; service role key can be added for admin operations.
 */

import { STORAGE_KEYS } from '../shared/constants.js';
import { get, getAll } from '../shared/storage.js';

// Lazy-initialised client instance
let _client = null;

/**
 * @typedef {Object} JobHistoryEntry
 * @property {string} id
 * @property {string} user_id
 * @property {string} url
 * @property {string|null} title
 * @property {string|null} company
 * @property {string|null} location
 * @property {string|null} description
 * @property {string|null} scraped_at
 */

/**
 * @typedef {Object} AnalysisResultEntry
 * @property {string} id
 * @property {string} job_id
 * @property {number|null} fluff_score
 * @property {any} buzzwords
 * @property {any} red_flags
 * @property {string|null} overall_assessment
 * @property {string|null} analyzed_at
 */

/**
 * Get the Supabase client (creates it lazily from storage).
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient|null>}
 */
export async function getSupabaseClient() {
  if (_client) return _client;

  const config = await getAll([
    STORAGE_KEYS.SUPABASE_URL,
    STORAGE_KEYS.SUPABASE_ANON_KEY,
  ]);

  const url = config[STORAGE_KEYS.SUPABASE_URL];
  const anonKey = config[STORAGE_KEYS.SUPABASE_ANON_KEY];

  if (!url || !anonKey) return null;

  // Dynamic import to keep the bundle lean
  const { createClient } = await import(
    /* webpackIgnore: true */
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
  );

  _client = createClient(url, anonKey);
  return _client;
}

/**
 * Save a job to job_history and optionally its analysis result.
 * Falls back gracefully if Supabase is not configured.
 *
 * @param {object} job
 * @param {object} [analysis]
 * @param {string} [userId]
 * @returns {Promise<{ jobId: string } | null>}
 */
export async function saveJobToHistory(job, analysis = null, userId = 'local-user') {
  const supabase = await getSupabaseClient();

  const historyEntry = {
    user_id: userId,
    url: job.url,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    scraped_at: new Date().toISOString(),
  };

  if (!supabase) {
    // Fall back to chrome.storage.local
    const { appendLocalHistory } = await import('../shared/storage.js');
    await appendLocalHistory({ ...historyEntry, analysis, saved_at: Date.now() });
    return { jobId: 'local', viaStorage: true };
  }

  try {
    const { data: jobData, error: jobErr } = await supabase
      .from('job_history')
      .insert(historyEntry)
      .select('id')
      .single();

    if (jobErr) throw jobErr;
    if (!jobData?.id) throw new Error('No job ID returned from Supabase');

    if (analysis) {
      const { error: analysisErr } = await supabase
        .from('analysis_results')
        .insert({
          job_id: jobData.id,
          fluff_score: analysis.fluffScore,
          buzzwords: analysis.buzzwordFactors,
          red_flags: analysis.redFlags,
          overall_assessment: analysis.overallAssessment,
          analyzed_at: new Date().toISOString(),
        });
      if (analysisErr) console.warn('[JSE Supabase] Analysis insert failed:', analysisErr.message);
    }

    return { jobId: jobData.id };
  } catch (err) {
    console.warn('[JSE Supabase] Save failed, falling back to local storage:', err.message);
    const { appendLocalHistory } = await import('../shared/storage.js');
    await appendLocalHistory({ ...historyEntry, analysis, saved_at: Date.now() });
    return { jobId: 'local', viaStorage: true };
  }
}

/**
 * Load recent job history entries.
 * @param {number} [limit=10]
 * @param {string} [userId]
 * @returns {Promise<Array>}
 */
export async function loadJobHistory(limit = 10, userId = 'local-user') {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    const { getLocalHistory } = await import('../shared/storage.js');
    const history = await getLocalHistory();
    return history.slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from('job_history')
      .select('*, analysis_results(fluff_score, overall_assessment, analyzed_at)')
      .eq('user_id', userId)
      .order('scraped_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[JSE Supabase] Load history failed, falling back to local:', err.message);
    const { getLocalHistory } = await import('../shared/storage.js');
    const history = await getLocalHistory();
    return history.slice(0, limit);
  }
}

/**
 * Clear all history for a user.
 * @param {string} [userId='local-user']
 */
export async function clearHistory(userId = 'local-user') {
  const supabase = await getSupabaseClient();

  if (supabase) {
    try {
      await supabase
        .from('job_history')
        .delete()
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[JSE Supabase] Clear failed:', err.message);
    }
  }

  const { clearLocalHistory } = await import('../shared/storage.js');
  await clearLocalHistory();
}
