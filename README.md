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

### 2. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create an API key (free tier available)
3. Click the extension's **⚙ Settings** icon in Chrome toolbar
4. Paste your API key and save

### 3. Configure Supabase (Optional)

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** in the Supabase dashboard
3. Run the schema SQL from the Settings page (included in `options/options.html` under "Supabase SQL Schema")
4. Copy your **Project URL** and **Anon Key** from Project Settings → API
5. Paste both into the Settings page

---

## Project Structure

```
job-seeker-extension/
├── manifest.json                 # MV3 manifest
├── _locales/                    # i18n strings (en/zh)
│   ├── en/messages.json
│   └── zh/messages.json
├── background/
│   ├── service-worker.js        # Message router + Gemini orchestration
│   ├── gemini.js               # Gemini API client
│   └── supabase-client.js      # Supabase persistence
├── content/
│   ├── content-entry.js        # Content script entry + MutationObserver
│   ├── dom-injector.js         # Tailwind CDN + overlay injection
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
                    gemini.js ──► Gemini API
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
