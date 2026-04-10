# DAT.co Monitor (Vercel-ready)

A Next.js website that tracks a DAT.co-related valuation indicator using **Strategy (MSTR) Premium to NAV / mNAV**.

## What this project does

- Fetches daily **BTC-USD** and **MSTR** price data from Yahoo Finance chart endpoints
- Uses a local **Strategy Bitcoin holdings seed file** to build daily NAV history
- Computes:
  - `NAV = BTC Holdings × BTC Price`
  - `mNAV = Market Cap / NAV`
  - `Premium to NAV = (mNAV - 1) × 100`
- Shows charts and KPI cards
- Includes an **optional AI summary** endpoint

## Why this version is deployment-friendly

This version is intentionally built to be stable on a free platform:

- No database required
- No paid backend required
- Works on the **Vercel Hobby** plan
- AI summary gracefully falls back to rule-based text when `OPENAI_API_KEY` is not provided

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

## Deploy to Vercel (free)

### Method 1: GitHub + Vercel dashboard

1. Create a new GitHub repository
2. Upload this project
3. Go to Vercel and sign in
4. Click **Add New Project**
5. Import your GitHub repository
6. Vercel will detect **Next.js** automatically
7. Click **Deploy**

That is enough for the base version.

### Optional environment variable

If you want AI-generated summaries via OpenAI:

- Add this in Vercel Project Settings → Environment Variables

```bash
OPENAI_API_KEY=your_key_here
```

Then redeploy.

## Recommended Vercel settings

- Framework Preset: **Next.js**
- Build Command: `next build` (default)
- Output Directory: leave empty / default
- Node version: default is fine

## Important note for your report

This project uses a **seed holdings file** in `data/strategy-holdings.json`.
For a stronger final academic submission, you should mention that:

- the current version uses manually maintained holdings checkpoints based on public company disclosures,
- and it can be upgraded into a fully automated data pipeline by scraping or parsing Strategy's official history/purchases pages.

## Files you will most likely edit

- `data/strategy-holdings.json` → update BTC holdings checkpoints
- `lib/indicator.ts` → adjust shares outstanding or formulas
- `app/page.tsx` → change dashboard text/UI
- `app/api/summary/route.ts` → customize AI summary prompt

## Suggested next upgrade

To make your assignment look even stronger, the next improvement should be:

1. Automatically parse Strategy official holdings history
2. Add a date range selector (30D / 90D / 1Y / MAX)
3. Add another DAT company for comparison
4. Add correlation / spread analysis with BTC

