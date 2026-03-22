/**
 * popup/popup.js
 * Compact extension popup — recent history + resume preview + quick actions.
 */

import { MESSAGE_TYPES, RESUME_PREVIEW_LENGTH } from '../shared/constants.js';
import { t, getCurrentLanguage } from '../shared/i18n.js';
import { getApiKey, getResume } from '../shared/storage.js';

// ─── DOM Refs ──────────────────────────────────────────────────────────────────

const $openText    = document.getElementById('popup-open-text');
const $title       = document.getElementById('popup-title');
const $resumeHeading  = document.getElementById('popup-resume-heading');
const $resumeContent  = document.getElementById('popup-resume-content');
const $noResume       = document.getElementById('popup-no-resume');
const $historyHeading = document.getElementById('popup-history-heading');
const $historyList    = document.getElementById('popup-history-list');
const $noHistory      = document.getElementById('popup-no-history');
const $apiWarning     = document.getElementById('popup-api-warning');
const $apiWarningText = document.getElementById('popup-api-warning-text');
const $openPanel      = document.getElementById('popup-open-panel');
const $openSettings   = document.getElementById('popup-open-settings');
const $popupSettings  = document.getElementById('popup-settings');

let currentLang = 'en';

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  currentLang = await getCurrentLanguage();
  applyLabels();
  await Promise.all([checkApiKey(), renderResume(), renderHistory()]);
}

function applyLabels() {
  const lang = currentLang;
  $title.textContent = t('app_name', lang);
  $openText.textContent = t('open_sidepanel', lang);
  $resumeHeading.textContent = t('resume_preview', lang);
  $historyHeading.textContent = t('recent_analyses', lang);
  $noResume.textContent = t('no_resume', lang);
  $noHistory.textContent = t('no_history', lang);
  $apiWarningText.textContent = t('api_key_missing', lang);
  $openSettings.textContent = t('open_settings', lang);
}

// ─── API Key Warning ───────────────────────────────────────────────────────────

async function checkApiKey() {
  const key = await getApiKey();
  if (!key) {
    $apiWarning.classList.remove('hidden');
  } else {
    $apiWarning.classList.add('hidden');
  }
}

// ─── Resume Preview ────────────────────────────────────────────────────────────

async function renderResume() {
  const resume = await getResume();
  if (!resume) {
    $resumeContent.classList.add('hidden');
    $noResume.classList.remove('hidden');
    return;
  }
  $resumeContent.classList.remove('hidden');
  $noResume.classList.add('hidden');
  const preview = resume.slice(0, RESUME_PREVIEW_LENGTH);
  $resumeContent.textContent = preview + (resume.length > RESUME_PREVIEW_LENGTH ? '…' : '');
}

// ─── History List ──────────────────────────────────────────────────────────────

async function renderHistory() {
  try {
    const { history } = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.LOAD_HISTORY,
      payload: { limit: 5 },
    });
    if (!history || history.length === 0) {
      $historyList.classList.add('hidden');
      $noHistory.classList.remove('hidden');
      return;
    }
    $historyList.classList.remove('hidden');
    $noHistory.classList.add('hidden');
    $historyList.innerHTML = history.slice(0, 3).map(entry => {
      const fluff = entry.analysis?.fluffScore;
      const title = entry.title || 'Unknown Role';
      const company = entry.company || '';
      const scoreColor = fluff == null ? '' :
        fluff >= 70 ? 'text-red-500' : fluff >= 40 ? 'text-amber-500' : 'text-green-500';
      const scoreText = fluff != null ? `<span class="${scoreColor} font-semibold">${fluff}</span>` : '';
      return `
        <a href="${escAttr(entry.url)}" target="_blank"
           class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition group">
          <div class="flex-1 min-w-0 mr-2">
            <p class="text-xs font-medium text-gray-800 truncate">${escHtml(title)}</p>
            ${company ? `<p class="text-xs text-gray-400 truncate">${escHtml(company)}</p>` : ''}
          </div>
          ${scoreText ? `<span class="text-xs">/100</span>` : ''}
        </a>
      `;
    }).join('');
  } catch (err) {
    console.warn('[JSE Popup] Failed to load history:', err);
    $historyList.classList.add('hidden');
    $noHistory.classList.remove('hidden');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;');
}

// ─── Event Handlers ────────────────────────────────────────────────────────────

$openPanel.addEventListener('click', async () => {
  try {
    await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    window.close();
  } catch {
    // Fallback
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDEPANEL });
    window.close();
  }
});

$openSettings.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

$popupSettings.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
