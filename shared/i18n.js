/**
 * shared/i18n.js
 * Bilingual (EN/ZH) string helper using chrome.i18n API.
 * Falls back to in-memory map so it works in content scripts too.
 */

import { LANGUAGE_PREF } from './constants.js';
import { getLanguagePref, getSessionLang, setSessionLang } from './storage.js';

// In-memory bilingual map used when chrome.i18n is not available (content scripts)
const LOCALIZED_STRINGS = {
  en: {
    analyzing: 'Analyzing job description...',
    no_job: 'No job listing detected on this page.',
    no_job_hint: 'Navigate to a job listing on SEEK or LinkedIn to see the analysis.',
    fluff_score: 'Fluff Score',
    fluff_score_sub: 'Corporate Jargon Density',
    buzzword_factors: 'BS Factor Breakdown',
    red_flags: 'Red Flags',
    no_red_flags: 'No major red flags detected',
    overall_assessment: 'Overall Assessment',
    job_summary: 'Job Summary',
    company: 'Company',
    location: 'Location',
    posted: 'Posted',
    salary: 'Salary',
    save_history: 'Save to History',
    copied: 'Copied!',
    dismiss: 'Dismiss',
    copy_summary: 'Copy Summary',
    reanalyze: 'Re-analyze',
    recent_analyses: 'Recent Analyses',
    no_history: 'No history yet',
    resume_preview: 'Resume Preview',
    no_resume: 'No resume stored. Add one in Settings.',
    api_key_missing: 'Gemini API key not configured. Please add it in Settings.',
    supabase_missing: 'Supabase not configured. History will be stored locally only.',
    saved: 'Saved!',
    save_failed: 'Save failed',
    severity_low: 'Low',
    severity_medium: 'Medium',
    severity_high: 'High',
    cat_role_ambiguity: 'Role Ambiguity',
    cat_culture_vagueness: 'Culture Vagueness',
    cat_ai_wfh: 'AI / WFH Obfuscation',
    cat_compensation: 'Compensation Vagueness',
    settings: 'Settings',
    open_settings: 'Open Settings',
    // Phase 2 — Real Requirements
    real_requirements: 'Real Requirements',
    must_haves: 'Must-Haves',
    wish_lists: 'Wish-Lists',
    hidden_requirements: 'Hidden Requirements',
    screening_signals: 'Screening Signals',
    // Phase 2 — AI Risk Index
    ai_risk_index: 'AI Risk Index',
    ai_risk_low: 'Low automation risk',
    ai_risk_medium: 'Moderate automation risk',
    ai_risk_high: 'High automation risk',
    tasks_at_risk: 'Tasks at automation risk',
    // Phase 2 — Company Reviews
    company_reviews: 'Company Reviews',
    common_praise: 'Common Praise',
    common_complaint: 'Common Complaint',
    no_reviews: 'Could not retrieve company reviews.',
    review_loading: 'Loading company reputation...',
    load_reviews: 'Load Reviews',
    // Phase 3 — Cover Letter
    cover_letter: 'Cover Letter',
    generate_cover_letter: 'Generate Cover Letter',
    generating_cover_letter: 'Generating cover letter...',
    cover_letter_ready: 'Cover letter ready',
    no_resume_stored: 'No resume stored. Add one in Settings.',
    copy_cover_letter: 'Copy Cover Letter',
    regenerate: 'Regenerate',
    cover_letter_generated: 'Cover letter generated',
    company_sentiment: 'Company Sentiment',
    sentiment_positive: 'What people like',
    sentiment_negative: 'What people dislike',
  },
  zh: {
    analyzing: '正在分析职位描述...',
    no_job: '未检测到职位信息',
    no_job_hint: '请打开 Seek 或 LinkedIn 上的招聘页面以查看分析结果。',
    fluff_score: '废话指数',
    fluff_score_sub: '企业黑话密度',
    buzzword_factors: '套路解析',
    red_flags: '危险信号',
    no_red_flags: '未检测到重大危险信号',
    overall_assessment: '综合评估',
    job_summary: '职位概要',
    company: '公司',
    location: '地点',
    posted: '发布于',
    salary: '薪资',
    save_history: '保存记录',
    copied: '已复制！',
    dismiss: '收起',
    copy_summary: '复制摘要',
    reanalyze: '重新分析',
    recent_analyses: '最近分析',
    no_history: '暂无历史记录',
    resume_preview: '简历预览',
    no_resume: '未存储简历，请在设置中添加。',
    api_key_missing: '未配置 Gemini API 密钥，请前往设置添加。',
    supabase_missing: '未配置 Supabase，历史记录将仅保存在本地。',
    saved: '已保存！',
    save_failed: '保存失败',
    severity_low: '低',
    severity_medium: '中',
    severity_high: '高',
    cat_role_ambiguity: '职责模糊',
    cat_culture_vagueness: '文化暧昧',
    cat_ai_wfh: 'AI/远程办公套路',
    cat_compensation: '薪资模糊',
    settings: '设置',
    open_settings: '打开设置',
    // Phase 2 — Real Requirements
    real_requirements: '真实要求',
    must_haves: '必备条件',
    wish_lists: '加分项',
    hidden_requirements: '隐性要求',
    screening_signals: '真实筛选信号',
    // Phase 2 — AI Risk Index
    ai_risk_index: 'AI 替代风险指数',
    ai_risk_low: '低自动化替代风险',
    ai_risk_medium: '中等自动化替代风险',
    ai_risk_high: '高自动化替代风险',
    tasks_at_risk: '存在替代风险的岗位任务',
    // Phase 2 — Company Reviews
    company_reviews: '公司口碑',
    common_praise: '常见好评',
    common_complaint: '常见差评',
    no_reviews: '无法获取该公司评价。',
    review_loading: '正在加载公司口碑...',
    load_reviews: '加载评价',
    // Phase 3 — Cover Letter
    cover_letter: '求职信',
    generate_cover_letter: '生成求职信',
    generating_cover_letter: '正在生成求职信...',
    cover_letter_ready: '求职信已生成',
    no_resume_stored: '未存储简历，请在设置中添加。',
    copy_cover_letter: '复制求职信',
    regenerate: '重新生成',
    cover_letter_generated: '求职信已生成',
    company_sentiment: '公司口碑',
    sentiment_positive: '员工好评',
    sentiment_negative: '员工差评',
  },
};

/**
 * Detect the language of a text string.
 * Looks for CJK Unicode ranges.
 * @param {string} text
 * @returns {'en' | 'zh'}
 */
export function detectLanguage(text) {
  if (!text) return 'en';
  const cjkRegex = /[\u4e00-\u9fff]/;
  return cjkRegex.test(text) ? 'zh' : 'en';
}

/**
 * Resolve the active language given a preference and optional override.
 * @param {'auto' | 'en' | 'zh'} pref
 * @param {'en' | 'zh' | null} sessionLang
 * @param {string | null} pageText  — text from the current page, used for auto-detect
 * @returns {'en' | 'zh'}
 */
export async function resolveLanguage(pref, sessionLang, pageText = null) {
  if (sessionLang) return sessionLang;

  if (pref === LANGUAGE_PREF.EN) return 'en';
  if (pref === LANGUAGE_PREF.ZH) return 'zh';

  // Auto-detect: prefer page language when available
  if (pageText) return detectLanguage(pageText);

  // Fallback: infer from browser locale
  const browserLang = navigator.language || 'en';
  return browserLang.startsWith('zh') ? 'zh' : 'en';
}

/**
 * Get a localized string, using chrome.i18n if available,
 * falling back to the local map.
 * @param {string} key
 * @param {'en' | 'zh'} lang
 * @returns {string}
 */
export function t(key, lang = 'en') {
  const strings = LOCALIZED_STRINGS[lang] || LOCALIZED_STRINGS.en;
  return strings[key] || LOCALIZED_STRINGS.en[key] || key;
}

/**
 * Set the session language override.
 * @param {'en' | 'zh'} lang
 */
export async function setLanguage(lang) {
  await setSessionLang(lang);
}

/**
 * Get the current resolved language for the UI.
 * Checks session override first, then storage preference.
 * @param {string | null} pageText
 * @returns {Promise<'en' | 'zh'>}
 */
export async function getCurrentLanguage(pageText = null) {
  const [pref, sessionLang] = await Promise.all([
    getLanguagePref(),
    getSessionLang(),
  ]);
  return resolveLanguage(pref, sessionLang, pageText);
}
