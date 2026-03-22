# Job Seeker BS Filter

A Chrome Extension (Manifest V3) that acts as a bilingual BS-Filter for job listings. Cuts through corporate jargon on SEEK, LinkedIn, and beyond using Gemini AI.

---

## Features

- **Platform-Agnostic Scraper** — Works on SEEK.com.au, LinkedIn, and generic corporate sites
- **Real-Time Analysis** — Gemini-powered Fluff Score (0–100), BS Factor Breakdown, Red Flag detection
- **Bilingual UI** — Toggle between English and Chinese (中文)
- **Side Panel + Popup** — Quick access via popup, full analysis via side panel
- **Supabase Sync** — Persist analysis history across devices (optional)
- **Resume Hub** — Store your resume for future Cover Letter generation
- **SPA Resilience** — MutationObserver handles LinkedIn/SEEK single-page navigation

---

## Prerequisites

- **Node.js** 18+ (optional, for local dev server)
- **Chrome** 114+ (Side Panel API requires Chrome 114+)
- **Google AI Studio** account — [Get a Gemini API key](https://aistudio.google.com)
- **Supabase** account (optional) — [Create a free project](https://supabase.com)

---

## Setup

### 1. Add Extension to Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `job-seeker-extension/` folder

### 2. Deploy the Gemini proxy on Vercel (required)

The extension **never** stores your Gemini API key. It calls your own Vercel function `api/analyze-job.js`, which reads `GEMINI_API_KEY` from Vercel env vars.

1. Push this repository to GitHub (it must include the `api/` folder).
2. In [Vercel](https://vercel.com) → **Add New Project** → import **this** repo (the one with `api/analyze-job.js`).
   - **Important:** If you already have another project on Vercel with a similar name (e.g. a **Flutter** or **Next.js** app), that deployment **does not** expose `/api/analyze-job`. You must either deploy **this** repo as a separate project or add the `api/` route to that project’s codebase.
3. **Environment variables** → add `GEMINI_API_KEY` (from [Google AI Studio](https://aistudio.google.com)).
4. Deploy. Your API base URL will look like: `https://<project-name>.vercel.app/api` (no trailing slash).

### 3. Point the extension at your API

1. Open the extension **Settings** (from the popup or side panel).
2. Under **Analysis API (Vercel)**, paste your base URL, e.g. `https://<project-name>.vercel.app/api`.
3. Save.

Local dev: run `vercel dev` (or your Node server on port 3000) and use `http://localhost:3000/api`.

### 4. Supabase (optional)

If you use Supabase for history sync, configure it in code / env as needed; the simplified Settings UI may not expose all fields.

---

## Project Structure

```
job-seeker-extension/
├── manifest.json                 # MV3 manifest
├── package.json                  # Enables Vercel Node + ESM for /api
├── api/
│   └── analyze-job.js            # Vercel serverless → Gemini (GEMINI_API_KEY server-side)
├── vercel.json                   # CORS headers for /api/*
├── _locales/                    # i18n strings (en/zh)
│   ├── en/messages.json
│   └── zh/messages.json
├── background/
│   ├── service-worker.js        # Message router + Gemini orchestration
│   ├── gemini.js               # Gemini API client
│   └── supabase-client.js      # Supabase persistence
├── content/
│   ├── content-globals.js      # Shared globals for content scripts (no ESM)
│   ├── content-entry.js        # Content script entry + MutationObserver
│   ├── dom-injector.js         # Injected styles (no external CDN on host pages)
│   └── scrapers/
│       ├── scraper-manager.js  # Platform router
│       ├── seek-scraper.js     # SEEK.com.au selectors
│       ├── linkedin-scraper.js # LinkedIn selectors
│       └── generic-scraper.js  # Corporate/Greenhouse/Workday fallback
├── sidepanel/
│   ├── sidepanel.html          # Side panel shell (Tailwind)
│   └── sidepanel.js            # Side panel logic
├── popup/
│   ├── popup.html              # Compact popup
│   └── popup.js                # Popup logic
├── options/
│   ├── options.html            # Settings page
│   └── options.js              # Settings logic
└── shared/
    ├── constants.js             # Shared constants
    ├── storage.js              # chrome.storage.local wrapper
    └── i18n.js                 # Bilingual string helper
```

---

## How It Works

```
User navigates to job page
         │
         ▼
content-entry.js (MutationObserver detects SPA changes)
         │
         ▼
scraper-manager.js → platform-specific scraper
         │
         ▼
scraped job data ──► service-worker.js (chrome.runtime.sendMessage)
                              │
                              ▼
                    gemini.js ──► your Vercel /api/analyze-job ──► Gemini API
                              │
                              ▼
                    results stored in chrome.storage.local
                              │
                              ▼
                    sidepanel.js / popup.js polls & renders
```

---

## Language Detection

The extension detects the language of the job description text and sends the appropriate prompt to Gemini:

- **CJK characters detected** → Chinese system prompt
- **Otherwise** → English system prompt

The UI language can also be toggled manually via the EN/中文 button in the side panel header, or set permanently in Settings.

---

## Supabase Schema

The following tables are required. Run this in your Supabase SQL Editor:

```sql
create table if not exists job_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-user',
  url text not null,
  title text,
  company text,
  location text,
  description text,
  scraped_at timestamptz default now()
);

create table if not exists analysis_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references job_history(id) on delete cascade,
  fluff_score integer check (fluff_score between 0 and 100),
  buzzwords jsonb,
  red_flags jsonb,
  overall_assessment text,
  analyzed_at timestamptz default now()
);

create index if not exists idx_job_history_user_date
  on job_history(user_id, scraped_at desc);
create index if not exists idx_analysis_results_job
  on analysis_results(job_id);

alter table job_history enable row level security;
alter table analysis_results enable row level security;

create policy "Allow anon inserts" on job_history
  for insert to anon with check (true);
create policy "Allow anon inserts results" on analysis_results
  for insert to anon with check (true);
```

---

## Adding Icons

The extension requires four icon files in `icons/`:

| File | Size |
|------|------|
| `icon16.png` | 16×16 |
| `icon32.png` | 32×32 |
| `icon48.png` | 48×48 |
| `icon128.png` | 128×128 |

You can generate these from any 512×512 PNG using `sips` (macOS):

```bash
sips -z 16 16 icon512.png --out icons/icon16.png
sips -z 32 32 icon512.png --out icons/icon32.png
sips -z 48 48 icon512.png --out icons/icon48.png
sips -z 128 128 icon512.png --out icons/icon128.png
```

Or use a free tool like [Favicon.io](https://favicon.io/) or [RealFaviconGenerator](https://realfavicongenerator.net/).

---

## Troubleshooting

**Side panel doesn't open?**
Chrome 114+ required. If you're on an older version, the extension will fall back to the popup.

**Scraper not finding job details?**
The generic scraper has heuristic fallbacks, but many sites use custom JS rendering. Open a GitHub issue with the site URL and I'll add a specific handler.

**Gemini returns an error?**
- Check your API key is saved in Settings (not expired, correct key format `AIza...`)
- Ensure `generativelanguage.googleapis.com` is not blocked in your network
- Check Chrome DevTools → Extensions → Service Worker console for error messages

**Supabase not saving?**
- Verify the SQL schema was run in the correct Supabase project
- Check RLS policies allow anonymous inserts (schema above includes this)
- Verify your anon key matches the project URL exactly

---

## Future Phases (Not Yet Implemented)

- **Cover Letter Generator** — Generate a tailored cover letter from the stored resume + JD
- **Online Review Aggregator** — Pull positive/negative insights from Glassdoor/Indeed via Gemini web search
- **AI Risk Index** — Score the role's exposure to AI automation displacement
- **Dark Mode** — Automatic OS-aware dark theme
