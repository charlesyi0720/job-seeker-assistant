/**
 * shared/storage.js
 * Wrapper around chrome.storage.local with typed getters/setters.
 */

import { STORAGE_KEYS, VERCEL_API_BASE_DEFAULT } from './constants.js';

/**
 * Get a single value from chrome.storage.local.
 * @param {string} key
 * @returns {Promise<any>}
 */
export function get(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result[key]);
      }
    });
  });
}

/**
 * Get multiple values from chrome.storage.local.
 * @param {string[]} keys
 * @returns {Promise<Record<string, any>>}
 */
export function getAll(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Set a single key-value pair.
 * @param {string} key
 * @param {any} value
 */
export function set(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Set multiple key-value pairs at once.
 * @param {Record<string, any>} obj
 */
export function setAll(obj) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(obj, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Remove a key from storage.
 * @param {string} key
 */
export function remove(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Clear all extension storage.
 */
export function clear() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

// Convenience typed helpers

/**
 * Base URL for the Vercel proxy (must end with `/api`, no trailing slash).
 * Uses Settings override, then bundled default.
 * @returns {Promise<string>}
 */
export async function getApiBaseUrl() {
  return (VERCEL_API_BASE_DEFAULT || '').trim().replace(/\/+$/, '');
}

export async function getSupabaseConfig() {
  const [url, anonKey] = await Promise.all([
    get(STORAGE_KEYS.SUPABASE_URL),
    get(STORAGE_KEYS.SUPABASE_ANON_KEY),
  ]);
  return { url, anonKey };
}

export async function getLanguagePref() {
  return (await get(STORAGE_KEYS.LANGUAGE_PREF)) || 'auto';
}

export async function getResume() {
  return (await get(STORAGE_KEYS.RESUME_TEXT)) || '';
}

export async function getResumeFileName() {
  return (await get(STORAGE_KEYS.RESUME_FILE_NAME)) || '';
}

export async function setResumeFileName(name) {
  return set(STORAGE_KEYS.RESUME_FILE_NAME, name || '');
}

export async function getSessionLang() {
  return (await get(STORAGE_KEYS.SESSION_LANG)) || null;
}

export async function setSessionLang(lang) {
  return set(STORAGE_KEYS.SESSION_LANG, lang);
}

export async function getCurrentJob() {
  return get(STORAGE_KEYS.CURRENT_JOB);
}

export async function setCurrentJob(job) {
  return set(STORAGE_KEYS.CURRENT_JOB, job);
}

export async function getLastAnalysis() {
  return get(STORAGE_KEYS.LAST_ANALYSIS);
}

export async function setLastAnalysis(analysis) {
  return set(STORAGE_KEYS.LAST_ANALYSIS, analysis);
}

export async function getLocalHistory() {
  return (await get(STORAGE_KEYS.LOCAL_HISTORY)) || [];
}

export async function appendLocalHistory(entry) {
  const history = await getLocalHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, 50);
  return set(STORAGE_KEYS.LOCAL_HISTORY, trimmed);
}

export async function clearLocalHistory() {
  return remove(STORAGE_KEYS.LOCAL_HISTORY);
}
