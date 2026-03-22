/**
 * options/options.js
 * Clean settings page — Resume and Language only.
 * No Supabase, no API keys, no developer features visible to end users.
 */

import { STORAGE_KEYS, LANGUAGE_PREF } from '../shared/constants.js';
import { setAll, getAll } from '../shared/storage.js';

// DOM Refs
const $resume     = document.getElementById('opt-resume');
const $langSelect = document.getElementById('opt-lang-select');
const $btnSave    = document.getElementById('opt-save');
const $toast      = document.getElementById('opt-toast');
const $toastText  = document.getElementById('opt-toast-text');

// ─── Load ──────────────────────────────────────────────────────────────────────

async function loadSettings() {
  const values = await getAll([STORAGE_KEYS.RESUME_TEXT, STORAGE_KEYS.LANGUAGE_PREF]);
  $resume.value     = values[STORAGE_KEYS.RESUME_TEXT] || '';
  $langSelect.value = values[STORAGE_KEYS.LANGUAGE_PREF] || LANGUAGE_PREF.AUTO;
}

// ─── Save ──────────────────────────────────────────────────────────────────────

async function saveSettings() {
  $btnSave.disabled = true;
  $btnSave.textContent = 'Saving...';
  try {
    await setAll({
      [STORAGE_KEYS.RESUME_TEXT]:    $resume.value,
      [STORAGE_KEYS.LANGUAGE_PREF]:  $langSelect.value,
    });
    toast('Settings saved!');
  } catch (err) {
    toast('Save failed: ' + err.message, true);
  } finally {
    $btnSave.disabled = false;
    $btnSave.textContent = 'Save Settings';
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg, isError = false) {
  $toastText.textContent = msg;
  $toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 text-sm px-5 py-2.5 rounded-xl shadow-lg transition-opacity ${isError ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`;
  $toast.classList.remove('opacity-0', 'pointer-events-none');
  $toast.classList.add('opacity-100');
  setTimeout(() => {
    $toast.classList.remove('opacity-100');
    $toast.classList.add('opacity-0');
  }, 2500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

loadSettings();
$btnSave.addEventListener('click', saveSettings);
