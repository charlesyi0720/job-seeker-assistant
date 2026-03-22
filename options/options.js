/**
 * options/options.js
 * Settings page — manages Supabase config, language, and resume.
 * NOTE: Gemini API key is now handled by the Vercel backend (server-side).
 */

import { STORAGE_KEYS, LANGUAGE_PREF } from '../shared/constants.js';
import { t } from '../shared/i18n.js';
import { setAll, getAll } from '../shared/storage.js';
import { clearHistory } from '../background/supabase-client.js';

// ─── DOM Refs ──────────────────────────────────────────────────────────────────

const $supabaseUrl  = document.getElementById('opt-supabase-url');
const $supabaseAnon = document.getElementById('opt-supabase-anon');
const $langSelect   = document.getElementById('opt-lang-select');
const $resume       = document.getElementById('opt-resume');
const $btnSave      = document.getElementById('opt-save');
const $btnClear     = document.getElementById('opt-clear');
const $toast        = document.getElementById('opt-toast');
const $toastText    = document.getElementById('opt-toast-text');

// ─── Labels ────────────────────────────────────────────────────────────────────

function applyLabels() {
  document.getElementById('opt-subtitle').textContent = 'Configuration & Settings';
  document.getElementById('opt-supabase-heading').textContent = 'Supabase (History Sync)';
  document.getElementById('opt-supabase-url-label').textContent = t('label_options_supabase_url', 'en');
  document.getElementById('opt-supabase-anon-label').textContent = t('label_options_supabase_anon_key', 'en');
  document.getElementById('opt-supabase-hint').innerHTML =
    'Supabase stores your analysis history across devices. Without it, data stays in your browser only. ' +
    '<a href="https://supabase.com" target="_blank" class="underline font-medium">Create a free project →</a>';
  document.getElementById('opt-lang-heading').textContent = 'Interface Language';
  document.getElementById('opt-lang-label').textContent = t('label_options_language', 'en');
  document.getElementById('opt-lang-auto-opt').textContent = t('label_options_lang_auto', 'en');
  document.getElementById('opt-lang-en-opt').textContent = t('label_options_lang_en', 'en');
  document.getElementById('opt-lang-zh-opt').textContent = t('label_options_lang_zh', 'en');
  document.getElementById('opt-resume-heading').textContent = 'Your Resume';
  document.getElementById('opt-resume-label').textContent = t('label_options_resume', 'en');
  document.getElementById('opt-resume-hint').textContent = t('label_options_resume_hint', 'en');
  document.getElementById('opt-save-text').textContent = t('label_options_save', 'en');
  document.getElementById('opt-clear-text').textContent = t('label_options_clear_history', 'en');
}

// ─── Load Current Values ────────────────────────────────────────────────────────

async function loadSettings() {
  const keys = [
    STORAGE_KEYS.SUPABASE_URL,
    STORAGE_KEYS.SUPABASE_ANON_KEY,
    STORAGE_KEYS.LANGUAGE_PREF,
    STORAGE_KEYS.RESUME_TEXT,
  ];
  const values = await getAll(keys);
  $supabaseUrl.value  = values[STORAGE_KEYS.SUPABASE_URL] || '';
  $supabaseAnon.value = values[STORAGE_KEYS.SUPABASE_ANON_KEY] || '';
  $langSelect.value   = values[STORAGE_KEYS.LANGUAGE_PREF] || LANGUAGE_PREF.AUTO;
  $resume.value       = values[STORAGE_KEYS.RESUME_TEXT] || '';
}

// ─── Save ──────────────────────────────────────────────────────────────────────

async function saveSettings() {
  $btnSave.disabled = true;
  $btnSave.textContent = 'Saving...';
  try {
    await setAll({
      [STORAGE_KEYS.SUPABASE_URL]:    $supabaseUrl.value.trim(),
      [STORAGE_KEYS.SUPABASE_ANON_KEY]: $supabaseAnon.value.trim(),
      [STORAGE_KEYS.LANGUAGE_PREF]:   $langSelect.value,
      [STORAGE_KEYS.RESUME_TEXT]:      $resume.value,
    });
    toast(t('label_options_saved', 'en'));
  } catch (err) {
    toast('Save failed: ' + err.message, true);
  } finally {
    $btnSave.disabled = false;
    $btnSave.textContent = t('label_options_save', 'en');
  }
}

// ─── Clear History ─────────────────────────────────────────────────────────────

async function handleClearHistory() {
  const confirmed = confirm('Clear all analysis history? This cannot be undone.');
  if (!confirmed) return;
  $btnClear.disabled = true;
  $btnClear.textContent = '...';
  try {
    await clearHistory();
    toast(t('label_options_cleared', 'en'));
  } catch (err) {
    toast('Clear failed: ' + err.message, true);
  } finally {
    $btnClear.disabled = false;
    $btnClear.textContent = t('label_options_clear_history', 'en');
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg, isError = false) {
  $toastText.textContent = msg;
  if (isError) {
    $toast.classList.remove('bg-gray-800');
    $toast.classList.add('bg-red-600');
  } else {
    $toast.classList.remove('bg-red-600');
    $toast.classList.add('bg-gray-800');
  }
  $toast.classList.remove('opacity-0', 'pointer-events-none');
  $toast.classList.add('opacity-100');
  setTimeout(() => {
    $toast.classList.remove('opacity-100');
    $toast.classList.add('opacity-0', 'pointer-events-none');
  }, 2500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

applyLabels();
loadSettings();

$btnSave.addEventListener('click', saveSettings);
$btnClear.addEventListener('click', handleClearHistory);
