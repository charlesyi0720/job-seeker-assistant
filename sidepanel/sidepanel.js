/**
 * sidepanel/sidepanel.js
 * Side panel logic — fetches job + analysis from service worker,
 * renders UI, handles user interactions.
 * Phase 2: Real Requirements, AI Risk Index, Company Reviews
 * Phase 3: Cover Letter Generator
 */

import { MESSAGE_TYPES, SCORE_THRESHOLDS, SEVERITY } from '../shared/constants.js';
import { t, getCurrentLanguage, setLanguage } from '../shared/i18n.js';
import { getResume } from '../shared/storage.js';

// ─── State ───────────────────────────────────────────────────────────────────

let currentLang = 'en';
let currentJob = null;
let currentAnalysis = null;
let currentLetter = null;
let reputationLoaded = false;
let currentReputation = null;

// ─── DOM References ────────────────────────────────────────────────────────────

const $loading       = document.getElementById('sp-loading');
const $noJob         = document.getElementById('sp-no-job');
const $error         = document.getElementById('sp-error');
const $content       = document.getElementById('sp-content');
const $actions       = document.getElementById('sp-actions');
const $langLabel     = document.getElementById('lang-label');
const $langToggle    = document.getElementById('lang-toggle');
const $title         = document.getElementById('sp-title');
const $loadingText   = document.getElementById('sp-loading-text');
const $noJobText     = document.getElementById('sp-no-job-text');
const $noJobHint     = document.getElementById('sp-no-job-hint');
const $errorText     = document.getElementById('sp-error-text');
const $errorRetry   = document.getElementById('sp-error-retry');
const $jobTitle      = document.getElementById('sp-job-title');
const $jobCompany    = document.getElementById('sp-job-company');
const $jobLocation   = document.getElementById('sp-job-location');
const $jobSalary     = document.getElementById('sp-job-salary');
const $jobPosted     = document.getElementById('sp-job-posted');
const $gaugeFill     = document.getElementById('sp-gauge-fill');
const $gaugeNumber   = document.getElementById('sp-gauge-number');
const $gaugeLabel    = document.getElementById('sp-gauge-label');
const $assessment    = document.getElementById('sp-assessment-text');
const $buzzwordsList = document.getElementById('sp-buzzwords-list');
const $redflagsList  = document.getElementById('sp-redflags-list');
const $btnSave       = document.getElementById('sp-btn-save');
const $btnSaveText   = document.getElementById('sp-btn-save-text');
const $btnCopy       = document.getElementById('sp-btn-copy');
const $btnCopyText   = document.getElementById('sp-btn-copy-text');
const $settingsLink  = document.getElementById('sp-settings-link');
const $toast         = document.getElementById('sp-toast');
const $toastText     = document.getElementById('sp-toast-text');
const $spHeading     = document.getElementById('sp-job-heading');
const $fluffHeading  = document.getElementById('sp-fluff-heading');
const $assessmentHeading = document.getElementById('sp-assessment-heading');
const $buzzwordsHeading  = document.getElementById('sp-buzzwords-heading');
const $redflagsHeading   = document.getElementById('sp-redflags-heading');

// ─── Language ──────────────────────────────────────────────────────────────────

async function initLanguage() {
  currentLang = await getCurrentLanguage();
  applyLabels();
  $langLabel.textContent = currentLang === 'zh' ? '中文' : 'EN';
}

function applyLabels() {
  $title.textContent = t('app_name', currentLang);
  $loadingText.textContent = t('analyzing', currentLang);
  $noJobText.textContent = t('no_job', currentLang);
  $noJobHint.textContent = t('no_job_hint', currentLang);
  $spHeading.textContent = t('job_summary', currentLang);
  $fluffHeading.textContent = t('fluff_score', currentLang);
  $assessmentHeading.textContent = t('overall_assessment', currentLang);
  $buzzwordsHeading.textContent = t('buzzword_factors', currentLang);
  $redflagsHeading.textContent = t('red_flags', currentLang);
  $btnSaveText.textContent = t('save_history', currentLang);
  $btnCopyText.textContent = t('copy_summary', currentLang);

  // Phase 2 — Real Requirements
  const $reqHeading = document.getElementById('sp-req-heading');
  const $mustLabel  = document.getElementById('sp-must-haves-label');
  const $wishLabel  = document.getElementById('sp-wish-lists-label');
  const $hiddenLabel = document.getElementById('sp-hidden-req-label');
  if ($reqHeading) $reqHeading.textContent = t('real_requirements', currentLang);
  if ($mustLabel) $mustLabel.textContent = t('must_haves', currentLang);
  if ($wishLabel) $wishLabel.textContent = t('wish_lists', currentLang);
  if ($hiddenLabel) $hiddenLabel.textContent = t('hidden_requirements', currentLang);

  // Phase 2 — AI Risk Index
  const $aiHeading   = document.getElementById('sp-ai-risk-heading');
  const $tasksLabel = document.getElementById('sp-tasks-at-risk-label');
  if ($aiHeading) $aiHeading.textContent = t('ai_risk_index', currentLang);
  if ($tasksLabel) $tasksLabel.textContent = t('tasks_at_risk', currentLang);

  // Phase 2 — Company Reviews
  const $revHeading   = document.getElementById('sp-reviews-heading');
  const $praiseLabel  = document.getElementById('sp-praise-label');
  const $complaintLabel = document.getElementById('sp-complaint-label');
  const $fetchReviews = document.getElementById('sp-fetch-reviews-text');
  if ($revHeading) $revHeading.textContent = t('company_sentiment', currentLang);
  if ($praiseLabel) $praiseLabel.textContent = t('common_praise', currentLang);
  if ($complaintLabel) $complaintLabel.textContent = t('common_complaint', currentLang);
  if ($fetchReviews) $fetchReviews.textContent = t('load_reviews', currentLang);

  // Phase 3 — Cover Letter
  const $clHeading  = document.getElementById('sp-cl-heading');
  const $clBtnText  = document.getElementById('sp-cl-btn-text');
  const $clEmptyText = document.getElementById('sp-cl-empty-text');
  const $clCopyText = document.getElementById('sp-copy-cl-text');
  const $clLoadingText = document.getElementById('sp-cl-loading-text');
  if ($clHeading) $clHeading.textContent = t('cover_letter', currentLang);
  if ($clBtnText) $clBtnText.textContent = t('generate_cover_letter', currentLang);
  if ($clEmptyText) $clEmptyText.textContent =
    currentLang === 'zh'
      ? '根据您的简历和职位描述生成一封定制求职信。'
      : 'Generate a tailored cover letter based on your resume and this job description.';
  if ($clCopyText) $clCopyText.textContent = t('copy_cover_letter', currentLang);
  if ($clLoadingText) $clLoadingText.textContent = t('generating_cover_letter', currentLang);

  // Re-render dynamic sections with new language
  if (currentAnalysis) {
    renderRealRequirements(currentAnalysis.realRequirements);
    renderAiRiskIndex(currentAnalysis.aiRiskIndex);
  }
  if (currentReputation) renderCompanyReputation(currentReputation);
}

$langToggle.addEventListener('click', async () => {
  currentLang = currentLang === 'en' ? 'zh' : 'en';
  await setLanguage(currentLang);
  $langLabel.textContent = currentLang === 'zh' ? '中文' : 'EN';
  applyLabels();
  if (currentJob) renderJobSummary();
  if (currentAnalysis) renderAnalysis();
  toast(t('saved', currentLang));
});

// ─── UI State Helpers ─────────────────────────────────────────────────────────

function showLoading() {
  $loading.classList.remove('hidden');
  $noJob.classList.add('hidden');
  $error.classList.add('hidden');
  $content.classList.add('hidden');
  $actions.classList.add('hidden');
}

function showNoJob() {
  $loading.classList.add('hidden');
  $noJob.classList.remove('hidden');
  $error.classList.add('hidden');
  $content.classList.add('hidden');
  $actions.classList.add('hidden');
}

function showError(msg) {
  $loading.classList.add('hidden');
  $noJob.classList.add('hidden');
  $error.classList.remove('hidden');
  $errorText.textContent = msg;
  $content.classList.add('hidden');
  $actions.classList.add('hidden');
}

function showContent() {
  $loading.classList.add('hidden');
  $noJob.classList.add('hidden');
  $error.classList.add('hidden');
  $content.classList.remove('hidden');
  $actions.classList.remove('hidden');
  // Show new sections
  document.getElementById('sp-req-section')?.classList.remove('hidden');
  document.getElementById('sp-ai-risk-section')?.classList.remove('hidden');
  document.getElementById('sp-reviews-section')?.classList.remove('hidden');
  document.getElementById('sp-cl-section')?.classList.remove('hidden');
}

// ─── Gauge ─────────────────────────────────────────────────────────────────────

function updateGauge(score) {
  const arcLen = 157;
  const filled = Math.round((score / 100) * arcLen);
  $gaugeFill.setAttribute('stroke-dasharray', `${filled} ${arcLen}`);
  $gaugeFill.setAttribute('stroke-dashoffset', '0');

  let color = '#10b981'; // green — low fluff
  let label = t('ai_risk_low', currentLang);
  if (score >= SCORE_THRESHOLDS.LOW && score < SCORE_THRESHOLDS.HIGH) {
    color = '#f59e0b';
    label = t('ai_risk_medium', currentLang);
  } else if (score >= SCORE_THRESHOLDS.HIGH) {
    color = '#ef4444';
    label = t('ai_risk_high', currentLang);
  }

  $gaugeFill.setAttribute('stroke', color);
  $gaugeNumber.textContent = score;
  $gaugeLabel.textContent = label;
  $gaugeLabel.style.color = color;
}

// ─── Severity Badge ─────────────────────────────────────────────────────────────

function severityColor(sev) {
  if (sev === SEVERITY.HIGH) return 'bg-red-100 text-red-700';
  if (sev === SEVERITY.MEDIUM) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function severityLabel(sev) {
  const map = {
    low: t('severity_low', currentLang),
    medium: t('severity_medium', currentLang),
    high: t('severity_high', currentLang),
  };
  return map[sev] || sev;
}

function categoryLabel(cat) {
  const map = {
    role_ambiguity: t('cat_role_ambiguity', currentLang),
    culture_vagueness: t('cat_culture_vagueness', currentLang),
    ai_wfh_obfuscation: t('cat_ai_wfh', currentLang),
    compensation_vague: t('cat_compensation', currentLang),
  };
  return map[cat] || cat;
}

// ─── Buzzword Card ─────────────────────────────────────────────────────────────

function renderBuzzwords(factors) {
  if (!factors || factors.length === 0) {
    $buzzwordsList.innerHTML = `<p class="text-xs text-gray-400">${t('no_red_flags', currentLang)}</p>`;
    return;
  }

  $buzzwordsList.innerHTML = factors.map(f => `
    <div class="slide-in flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
      <span class="flex-shrink-0 mt-0.5 text-sm">💬</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-medium text-gray-800 truncate">${escHtml(f.phrase)}</span>
          <span class="text-xs px-1.5 py-0.5 rounded ${severityColor(f.severity)}">${severityLabel(f.severity)}</span>
          <span class="text-xs text-gray-400">${categoryLabel(f.category)}</span>
        </div>
        <p class="text-xs text-gray-500 mt-0.5 leading-relaxed">${escHtml(f.context)}</p>
      </div>
    </div>
  `).join('');
}

// ─── Red Flag Card ─────────────────────────────────────────────────────────────

function renderRedFlags(flags) {
  if (!flags || flags.length === 0) {
    $redflagsList.innerHTML = `<p id="sp-no-redflags" class="text-xs text-gray-400">${t('no_red_flags', currentLang)}</p>`;
    return;
  }

  $redflagsList.innerHTML = flags.map(f => `
    <div class="slide-in flex items-start gap-2 p-2 rounded-lg bg-red-50 hover:bg-red-100 transition">
      <span class="flex-shrink-0 text-red-500 mt-0.5">⚠️</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-medium text-red-800">${escHtml(f.text)}</span>
          <span class="text-xs px-1.5 py-0.5 rounded ${severityColor(f.severity)}">${severityLabel(f.severity)}</span>
        </div>
        ${f.category ? `<span class="text-xs text-red-400 mt-0.5">${escHtml(f.category)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// ─── Phase 2: Real Requirements ────────────────────────────────────────────────

function renderRealRequirements(rr) {
  const $section = document.getElementById('sp-req-section');
  if (!rr) { $section?.classList.add('hidden'); return; }
  $section?.classList.remove('hidden');

  document.getElementById('sp-must-haves').innerHTML =
    (rr.mustHaves || []).map(s => `<li>${escHtml(s)}</li>`).join('') ||
    `<li class="text-gray-400 italic">${t('no_red_flags', currentLang)}</li>`;

  document.getElementById('sp-wish-lists').innerHTML =
    (rr.wishLists || []).map(s => `<li>${escHtml(s)}</li>`).join('') ||
    `<li class="text-gray-300 italic">—</li>`;

  const $hidden  = document.getElementById('sp-hidden-req-wrapper');
  const $hiddenList = document.getElementById('sp-hidden-reqs');
  if (rr.hiddenRequirements && rr.hiddenRequirements.length > 0) {
    $hidden?.classList.remove('hidden');
    $hiddenList.innerHTML = rr.hiddenRequirements.map(s => `<li>${escHtml(s)}</li>`).join('');
  } else {
    $hidden?.classList.add('hidden');
  }
}

// ─── Phase 2: AI Risk Index ───────────────────────────────────────────────────

function renderAiRiskIndex(ai) {
  const $section = document.getElementById('sp-ai-risk-section');
  if (!ai) { $section?.classList.add('hidden'); return; }
  $section?.classList.remove('hidden');

  const score = ai.score || 0;
  const fill = document.getElementById('sp-ai-risk-fill');
  const scoreEl = document.getElementById('sp-ai-risk-score');
  const analysisEl = document.getElementById('sp-ai-risk-analysis');

  fill.style.width = score + '%';
  fill.style.background =
    score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981';
  scoreEl.textContent = score;

  analysisEl.textContent = ai.analysis || '';

  const $tasksSection = document.getElementById('sp-ai-risk-tasks-wrapper');
  const $tasksList = document.getElementById('sp-ai-risk-tasks');
  if (ai.tasks && ai.tasks.length > 0) {
    $tasksSection?.classList.remove('hidden');
    $tasksList.innerHTML = ai.tasks.map(t => `<li>${escHtml(t)}</li>`).join('');
  } else {
    $tasksSection?.classList.add('hidden');
  }
}

// ─── Phase 2: Company Reputation ──────────────────────────────────────────────

function renderCompanyReputation(sentiment) {
  document.getElementById('sp-reviews-loading').classList.add('hidden');
  document.getElementById('sp-reviews-content').classList.remove('hidden');
  document.getElementById('sp-review-positive').textContent =
    sentiment?.positive || t('no_reviews', currentLang);
  document.getElementById('sp-review-negative').textContent =
    sentiment?.negative || t('no_reviews', currentLang);
  currentReputation = sentiment;
  reputationLoaded = true;
}

// ─── Phase 2: Load Company Reviews Handler ─────────────────────────────────────

async function handleFetchReviews() {
  if (!currentJob?.company || reputationLoaded) return;

  const $loading = document.getElementById('sp-reviews-loading');
  const $btn = document.getElementById('sp-btn-fetch-reviews');
  const $error = document.getElementById('sp-reviews-error');

  $loading.classList.remove('hidden');
  $error.classList.add('hidden');
  $btn.disabled = true;

  try {
    const resp = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.FETCH_REPUTATION,
      payload: { company: currentJob.company, lang: currentLang },
    });
    if (resp?.error) throw new Error(resp.error);
    renderCompanyReputation(resp.sentiment);
  } catch (err) {
    $loading.classList.add('hidden');
    document.getElementById('sp-reviews-content').classList.add('hidden');
    $error.classList.remove('hidden');
    $error.textContent = err.message;
  } finally {
    $btn.disabled = false;
  }
}

// ─── Phase 3: Cover Letter Generator ──────────────────────────────────────────

async function handleGenerateCoverLetter() {
  const resume = await getResume();

  if (!resume || !resume.trim()) {
    document.getElementById('sp-no-resume-error')?.classList.remove('hidden');
    return;
  }

  document.getElementById('sp-no-resume-error')?.classList.add('hidden');
  document.getElementById('sp-cl-empty')?.classList.add('hidden');
  document.getElementById('sp-cl-result')?.classList.add('hidden');

  const $loading = document.getElementById('sp-cl-loading');
  const $progress = document.getElementById('sp-cl-progress');
  $loading?.classList.remove('hidden');

  // Fake progress animation
  let pct = 0;
  const interval = setInterval(() => {
    pct = Math.min(pct + 12, 80);
    if ($progress) $progress.style.width = pct + '%';
  }, 350);

  try {
    const resp = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GENERATE_COVER_LETTER,
      payload: { job: currentJob, resume, lang: currentLang },
    });

    clearInterval(interval);
    if ($progress) $progress.style.width = '100%';

    if (resp?.error) throw new Error(resp.error);

    currentLetter = resp.letter;
    const $content = document.getElementById('sp-cl-content');
    if ($content) $content.textContent = resp.letter;

    setTimeout(() => {
      $loading?.classList.add('hidden');
      document.getElementById('sp-cl-result')?.classList.remove('hidden');
    }, 250);

    toast(t('cover_letter_generated', currentLang));
  } catch (err) {
    clearInterval(interval);
    $loading?.classList.add('hidden');
    const $emptyText = document.getElementById('sp-cl-empty-text');
    const $empty = document.getElementById('sp-cl-empty');
    if ($emptyText) $emptyText.textContent = 'Error: ' + err.message;
    if (err.message === 'RESUME_NOT_PROVIDED') {
      document.getElementById('sp-no-resume-error')?.classList.remove('hidden');
    } else {
      $empty?.classList.remove('hidden');
    }
  }
}

// ─── Job Summary ───────────────────────────────────────────────────────────────

function renderJobSummary() {
  if (!currentJob) return;
  $jobTitle.textContent = currentJob.title || 'Unknown Position';
  $jobCompany.innerHTML = `<span>🏢</span> ${escHtml(currentJob.company || 'Unknown')}`;
  $jobLocation.innerHTML = `<span>📍</span> ${escHtml(currentJob.location || '—')}`;
  $jobSalary.innerHTML = currentJob.salary
    ? `<span>💰</span> ${escHtml(currentJob.salary)}`
    : `<span>💰</span> —`;
  $jobPosted.textContent = currentJob.postedDate
    ? `📅 ${t('posted', currentLang)}: ${escHtml(currentJob.postedDate)}`
    : '';
}

// ─── Analysis Renderer ─────────────────────────────────────────────────────────

function renderAnalysis() {
  if (!currentAnalysis) return;
  updateGauge(currentAnalysis.fluffScore);
  $assessment.textContent = currentAnalysis.overallAssessment || '';
  renderBuzzwords(currentAnalysis.buzzwordFactors);
  renderRedFlags(currentAnalysis.redFlags);
  // Phase 2 sections
  renderRealRequirements(currentAnalysis.realRequirements);
  renderAiRiskIndex(currentAnalysis.aiRiskIndex);
  // Reputation — reset so user can re-fetch on language switch
  reputationLoaded = false;
  currentReputation = null;
  document.getElementById('sp-reviews-loading')?.classList.add('hidden');
  document.getElementById('sp-reviews-content')?.classList.add('hidden');
  document.getElementById('sp-reviews-error')?.classList.add('hidden');
}

// ─── Full Render ───────────────────────────────────────────────────────────────

function render(job, analysis) {
  currentJob = job;
  currentAnalysis = analysis;
  if (!job) { showNoJob(); return; }
  showContent();
  renderJobSummary();
  renderAnalysis();
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg, duration = 2000) {
  $toastText.textContent = msg;
  $toast.classList.remove('opacity-0');
  $toast.classList.add('opacity-100');
  setTimeout(() => {
    $toast.classList.remove('opacity-100');
    $toast.classList.add('opacity-0');
  }, duration);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

$btnSave.addEventListener('click', async () => {
  if (!currentJob) return;
  $btnSave.disabled = true;
  $btnSaveText.textContent = '...';
  try {
    const resp = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_TO_HISTORY,
      payload: { job: currentJob, analysis: currentAnalysis },
    });
    if (resp?.error) throw new Error(resp.error);
    toast(t('saved', currentLang));
  } catch (err) {
    toast(t('save_failed', currentLang) + ': ' + err.message, 3000);
  } finally {
    $btnSave.disabled = false;
    $btnSaveText.textContent = t('save_history', currentLang);
  }
});

$btnCopy.addEventListener('click', async () => {
  if (!currentJob) return;
  const text = [
    currentJob.title,
    currentJob.company,
    currentJob.location,
    currentJob.salary,
    '',
    currentJob.description,
    '',
    currentAnalysis ? `Fluff Score: ${currentAnalysis.fluffScore}/100` : '',
    currentAnalysis?.overallAssessment || '',
  ].filter(Boolean).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    toast(t('copied', currentLang));
  } catch {
    toast('Copy failed');
  }
});

$settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

$errorRetry.addEventListener('click', async () => {
  if (!currentJob) return;
  showLoading();
  try {
    const resp = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.ANALYZE_JOB,
      payload: { job: currentJob, lang: currentLang },
    });
    if (resp?.error) throw new Error(resp.error);
    currentAnalysis = resp.analysis;
    render(currentJob, currentAnalysis);
  } catch (err) {
    showError(err.message);
  }
});

// Phase 2 — Reviews
document.getElementById('sp-btn-fetch-reviews')?.addEventListener('click', handleFetchReviews);

// Phase 3 — Cover Letter
document.getElementById('sp-btn-generate-cl')?.addEventListener('click', handleGenerateCoverLetter);
document.getElementById('sp-btn-regenerate-cl')?.addEventListener('click', handleGenerateCoverLetter);
document.getElementById('sp-btn-copy-cl')?.addEventListener('click', async () => {
  if (!currentLetter) return;
  try {
    await navigator.clipboard.writeText(currentLetter);
    toast(t('copied', currentLang));
  } catch {
    toast('Copy failed');
  }
});

// ─── Listen for analysis results from service worker ─────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.JOB_ANALYZED) {
    render(message.payload.job, message.payload.analysis);
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  await initLanguage();
  showLoading();

  try {
    const { job, analysis } = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_CURRENT_JOB,
    });
    if (job) {
      render(job, analysis);
    } else {
      showNoJob();
    }
  } catch (err) {
    showError(err.message);
  }
}

init();
