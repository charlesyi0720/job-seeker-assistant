/**
 * api/analyze-job.js
 * Vercel Serverless Function — proxies all Gemini AI calls.
 * Holds GEMINI_API_KEY server-side so it never ships to the browser extension.
 *
 * Modes:
 *   analyze     — Full BS Meter analysis (fluff score, buzzwords, AI risk, real requirements)
 *   reputation  — Company praise/complaint sentiment
 *   coverletter — Tailored cover letter generation
 *
 * POST /api/analyze-job
 * Body: { job: { title, company, description }, resume?: string, mode: string, lang: 'en'|'zh' }
 */

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ─── Entry Point ───────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).set(CORS_HEADERS).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[analyze-job] GEMINI_API_KEY not set in Vercel environment variables.');
    return res.status(500).set(CORS_HEADERS).json({ error: 'GEMINI_API_KEY_NOT_CONFIGURED' });
  }

  const { job, resume, mode = 'analyze', lang = 'en' } = req.body || {};

  if (!job || !job.title || !job.description) {
    return res.status(400).set(CORS_HEADERS).json({ error: 'Invalid request: job.title and job.description are required.' });
  }

  try {
    const result = await callGemini({ job, resume, mode, lang }, apiKey);
    return res.status(200).set(CORS_HEADERS).json({ result });
  } catch (err) {
    console.error('[analyze-job] Gemini call failed:', err.message);
    return res.status(500).set(CORS_HEADERS).json({ error: err.message });
  }
}

// ─── Gemini Call ────────────────────────────────────────────────────────────────

async function callGemini({ job, resume, mode, lang }, apiKey) {
  const { systemPrompt, userPrompt, genConfig } = buildPrompt({ job, resume, mode, lang });
  const url = `${GEMINI_BASE}?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: genConfig,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.finishMessage?.content?.parts?.[0]?.text ||
    '';

  if (!rawText) throw new Error('Gemini returned an empty response.');

  // Cover letter is plain text; analysis/reputation are JSON
  if (mode === 'coverletter') {
    return stripFences(rawText);
  }

  const cleaned = stripFences(rawText);
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${cleaned.slice(0, 200)}`);
  }
}

function stripFences(raw) {
  return raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
}

// ─── Prompt Builder ────────────────────────────────────────────────────────────

function buildPrompt({ job, resume, mode, lang }) {
  if (mode === 'analyze') {
    return {
      systemPrompt: lang === 'zh' ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN,
      userPrompt: lang === 'zh'
        ? `职位：${job.title}\n公司：${job.company || '未知公司'}\n职位描述：\n${job.description}`
        : `Job Title: ${job.title}\nCompany: ${job.company || 'Unknown'}\nJob Description:\n${job.description}`,
      genConfig: { temperature: 0.2, maxOutputTokens: 1200, responseMimeType: 'application/json' },
    };
  }

  if (mode === 'reputation') {
    return {
      systemPrompt: lang === 'zh' ? REPUTATION_PROMPT_ZH : REPUTATION_PROMPT_EN,
      userPrompt: `Company: ${job.company}`,
      genConfig: { temperature: 0.3, maxOutputTokens: 300, responseMimeType: 'application/json' },
    };
  }

  if (mode === 'coverletter') {
    return {
      systemPrompt: lang === 'zh' ? COVER_LETTER_PROMPT_ZH : COVER_LETTER_PROMPT_EN,
      userPrompt: lang === 'zh'
        ? `职位：${job.title}\n公司：${job.company || '未知公司'}\n职位描述：\n${job.description}\n\n求职者简历：\n${resume}`
        : `Job Title: ${job.title}\nCompany: ${job.company || 'Unknown'}\nJob Description:\n${job.description}\n\nApplicant Resume:\n${resume}`,
      genConfig: { temperature: 0.6, maxOutputTokens: 600, responseMimeType: 'text/plain' },
    };
  }

  throw new Error(`Unknown mode: ${mode}`);
}

// ─── Prompts (mirrored from extension gemini.js) ───────────────────────────────

const SYSTEM_PROMPT_EN = `You are a senior labour economist and career analyst. Your task is to analyse a job description and return a structured, honest assessment.

Respond ONLY with valid JSON matching this schema:
{
  "fluffScore": number,
  "buzzwordFactors": [
    { "phrase": string, "category": string, "severity": string, "context": string }
  ],
  "redFlags": [
    { "text": string, "severity": string, "category": string }
  ],
  "overallAssessment": string,
  "realRequirements": {
    "mustHaves": string[],
    "wishLists": string[],
    "hiddenRequirements": string[],
    "screeningSignals": string[]
  },
  "aiRiskIndex": {
    "score": number,
    "exposure": string,
    "analysis": string,
    "tasks": string[]
  }
}

Rules:
- fluffScore: integer 0-100, corporate jargon density (higher = more fluff).
- aiRiskIndex.score: integer 0-100, how automatable the role's core tasks are (higher = more at risk from LLM/AI displacement).
- buzzwordFactors: 3-8 entries. Categories: role_ambiguity | culture_vagueness | ai_wfh_obfuscation | compensation_vague | requirements_washing.
- realRequirements.mustHaves: skills/qualifications that are genuine barriers to entry.
- realRequirements.wishLists: nice-to-have skills that rarely screen candidates out.
- realRequirements.hiddenRequirements: unstated requirements inferred from language (e.g. unpaid overtime culture, nationality requirements, frequent travel not mentioned).
- realRequirements.screeningSignals: phrases that indicate genuine role substance vs. padding.
- aiRiskIndex.tasks: 3-5 specific tasks most exposed to AI/LLM automation.
- Do NOT fabricate company-specific information.
- JSON only — no markdown, no preamble, no explanation.`;

const SYSTEM_PROMPT_ZH = `你是一位资深劳动力经济学家和职业分析师。你的任务是分析职位描述并返回结构化的、诚实的评估。

只返回符合以下 schema 的有效 JSON：
{
  "fluffScore": number,
  "buzzwordFactors": [
    { "phrase": string, "category": string, "severity": string, "context": string }
  ],
  "redFlags": [
    { "text": string, "severity": string, "category": string }
  ],
  "overallAssessment": string,
  "realRequirements": {
    "mustHaves": string[],
    "wishLists": string[],
    "hiddenRequirements": string[],
    "screeningSignals": string[]
  },
  "aiRiskIndex": {
    "score": number,
    "exposure": string,
    "analysis": string,
    "tasks": string[]
  }
}

规则：
- fluffScore：整数 0-100，企业黑话密度（越高 = 废话越多）。
- aiRiskIndex.score：整数 0-100，岗位核心任务被 AI/LLM 替代的风险程度（越高 = 风险越大）。
- buzzwordFactors：3-8 条。分类：role_ambiguity | culture_vagueness | ai_wfh_obfuscation | compensation_vague | requirements_washing。
- realRequirements.mustHaves：真正的入场门槛（实际筛选标准）。
- realRequirements.wishLists：加分项，极少用于筛选。
- realRequirements.hiddenRequirements：从语言中推断的隐性要求（如未提及的加班文化、国籍要求、频繁出差）。
- realRequirements.screeningSignals：JD 中表明职位实质内容的标记 vs. 凑字数的信号。
- aiRiskIndex.tasks：3-5 项最容易被 AI/LLM 替代的具体工作任务。
- 不要捏造公司具体信息。
- 只返回 JSON — 不要 markdown，不要前言，不要解释。`;

const REPUTATION_PROMPT_EN = `You are a company reputation analyst. Based on your training knowledge, provide the most commonly cited positive and negative employee experience for the company named.

Respond ONLY with valid JSON:
{"positive":"one sentence of the most commonly cited positive employee experience","negative":"one sentence of the most commonly cited negative employee experience"}

If you have no reliable information about this company, return: {"positive":"Insufficient data.","negative":"Insufficient data."}
No markdown, no preamble.`;

const REPUTATION_PROMPT_ZH = `你是一位企业声誉分析师。根据你的训练知识，提供该公司最常见的员工正面和负面工作体验。

只返回有效 JSON：
{"positive":"一句最常见的员工好评","negative":"一句最常见的员工差评"}

如果没有关于该公司的可靠信息，返回：{"positive":"数据不足。","negative":"数据不足。"}
不要 markdown，不要前言。`;

const COVER_LETTER_PROMPT_EN = `You are a senior career coach. Write a concise, authentic cover letter for a job applicant.

Rules:
- Maximum 250 words.
- Do NOT be robotic or use cliché phrases (no "I am writing to express my keen interest").
- Address the HIDDEN REQUIREMENTS from the job description — unstated culture, unwritten expectations.
- Match the applicant's real skills from their resume to the genuine screening signals in the JD.
- Format as plain text with 3 paragraphs: Opening / Body / Closing.
- Sign off as "[Your Name]".
- Never fabricate skills or experience the applicant doesn't have.
- Tone: professional, direct, human — like a smart colleague advising you.
- Language: based on the job description language (English).`;

const COVER_LETTER_PROMPT_ZH = `你是一位资深职业教练。请为求职者撰写一封简洁、真实、富有感染力的求职信。

规则：
- 最多 250 字。
- 不要使用机器人腔调或陈词滥调（如"我谨此写信表达我的浓厚兴趣"）。
- 针对职位描述中的隐性要求撰写 — 未明说的文化、潜规则。
- 将求职者的真实技能与职位描述中的真实筛选信号匹配。
- 格式：3段式 — 开篇 / 正文 / 结尾。
- 落款：[Your Name]。
- 绝不要捏造简历中没有的技能或经历。
- 语气：专业、直接、有温度 — 像一个聪明的朋友在给你建议。
- 语言：基于职位描述语言（中文）。`;
