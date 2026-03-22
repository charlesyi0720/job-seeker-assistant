/**
 * options/options.js
 * Settings page — PDF resume upload and language preference.
 */

import { STORAGE_KEYS, LANGUAGE_PREF } from '../shared/constants.js';
import { setAll, getAll } from '../shared/storage.js';

const PDFJS_WORKER_SRC =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * PDF.js legacy script (in options.html <head>) exposes the API on a few possible globals.
 */
function getPdfJs() {
  const g = typeof globalThis !== 'undefined' ? globalThis : window;
  const lib = g.pdfjsLib || g['pdfjs-dist/build/pdf'];
  if (!lib || typeof lib.getDocument !== 'function') {
    throw new Error(
      'PDF.js failed to load. Check your network, reload this page, or update the extension.'
    );
  }
  if (!lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
  }
  return lib;
}

// ─── DOM Refs ──────────────────────────────────────────────────────────────────

const $langSelect = document.getElementById('opt-lang-select');
const $btnSave    = document.getElementById('opt-save');
const $toast      = document.getElementById('opt-toast');
const $toastText  = document.getElementById('opt-toast-text');

const $uploadZone    = document.getElementById('resume-upload-zone');
const $fileInput     = document.getElementById('resume-file-input');
const $idle          = document.getElementById('resume-upload-idle');
const $uploading     = document.getElementById('resume-uploading');
const $uploadSuccess = document.getElementById('resume-upload-success');
const $uploadError   = document.getElementById('resume-upload-error');
const $fileName      = document.getElementById('resume-file-name');
const $errorMsg      = document.getElementById('resume-error-msg');
const $textSection   = document.getElementById('resume-text-section');
const $resumeText    = document.getElementById('opt-resume');
const $removeSection = document.getElementById('resume-remove-section');
const $removeBtn     = document.getElementById('resume-remove-btn');

// ─── Upload helpers ────────────────────────────────────────────────────────────

function showUploadState(state) {
  [$idle, $uploading, $uploadSuccess, $uploadError].forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('flex');
  });
  switch (state) {
    case 'idle':
      $idle.classList.remove('hidden');
      break;
    case 'uploading':
      $uploading.classList.remove('hidden');
      $uploading.classList.add('flex');
      break;
    case 'success':
      $uploadSuccess.classList.remove('hidden');
      break;
    case 'error':
      $uploadError.classList.remove('hidden');
      break;
  }
}

async function extractTextFromPdf(file) {
  const pdfjs = getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map(item => item.str).join(' '));
  }
  return pageTexts.join('\n\n').trim();
}

async function handleFile(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    showUploadState('error');
    $errorMsg.textContent = 'Only PDF files are supported.';
    return;
  }
  showUploadState('uploading');
  try {
    const text = await extractTextFromPdf(file);
    if (!text || text.trim().length < 20) {
      showUploadState('error');
      $errorMsg.textContent =
        'Could not extract enough text from this PDF. It may be a scanned image (not text-based).';
      return;
    }
    await setAll({
      [STORAGE_KEYS.RESUME_TEXT]: text,
      [STORAGE_KEYS.RESUME_FILE_NAME]: file.name,
    });
    $fileName.textContent = file.name;
    $resumeText.value = text;
    $textSection.classList.remove('hidden');
    $removeSection.classList.remove('hidden');
    showUploadState('success');
    toast(`Resume saved! (${text.length} characters — used when you generate a cover letter)`);
  } catch (err) {
    console.error('[JSE Settings] PDF extraction failed:', err);
    showUploadState('error');
    $errorMsg.textContent = `Failed: ${err.message}`;
  }
}

async function removeResume() {
  await setAll({
    [STORAGE_KEYS.RESUME_TEXT]: '',
    [STORAGE_KEYS.RESUME_FILE_NAME]: '',
  });
  $resumeText.value = '';
  $textSection.classList.add('hidden');
  $removeSection.classList.add('hidden');
  showUploadState('idle');
  toast('Resume removed.');
}

// ─── Load ──────────────────────────────────────────────────────────────────────

async function loadSettings() {
  const values = await getAll([
    STORAGE_KEYS.RESUME_TEXT,
    STORAGE_KEYS.RESUME_FILE_NAME,
    STORAGE_KEYS.LANGUAGE_PREF,
  ]);
  $langSelect.value = values[STORAGE_KEYS.LANGUAGE_PREF] || LANGUAGE_PREF.AUTO;

  const resumeText = values[STORAGE_KEYS.RESUME_TEXT] || '';
  const fileName = values[STORAGE_KEYS.RESUME_FILE_NAME] || '';
  if (resumeText.trim()) {
    $fileName.textContent = fileName || 'Saved resume';
    $resumeText.value = resumeText;
    $textSection.classList.remove('hidden');
    $removeSection.classList.remove('hidden');
    showUploadState('success');
  } else {
    showUploadState('idle');
  }
}

// ─── Save ──────────────────────────────────────────────────────────────────────

async function saveSettings() {
  $btnSave.disabled = true;
  $btnSave.textContent = 'Saving…';
  try {
    await setAll({
      [STORAGE_KEYS.LANGUAGE_PREF]: $langSelect.value,
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

$uploadZone.addEventListener('click', () => $fileInput.click());
$fileInput.addEventListener('change', () => {
  if ($fileInput.files?.[0]) handleFile($fileInput.files[0]);
  $fileInput.value = '';
});
$uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  $uploadZone.classList.add('border-indigo-400', 'bg-indigo-50');
});
$uploadZone.addEventListener('dragleave', () => {
  $uploadZone.classList.remove('border-indigo-400', 'bg-indigo-50');
});
$uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  $uploadZone.classList.remove('border-indigo-400', 'bg-indigo-50');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

$removeBtn?.addEventListener('click', removeResume);
$btnSave.addEventListener('click', saveSettings);

loadSettings();
