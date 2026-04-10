# DAT.co Monitor (Auto-updating free-hosting version)

This Next.js app tracks Strategy's Premium to NAV and mNAV.

## What changed in this version

- BTC and MSTR prices refresh from Yahoo Finance with a 300-second cache window.
- The browser polls `/api/indicator` every 5 minutes while the page is open.
- Strategy holdings are checked against the official `https://www.strategy.com/purchases` and `https://www.strategy.com/history` pages every 5 minutes and merged with the seeded historical holdings file.
- If live holdings parsing fails, the app falls back to the local seed file.

## Important Vercel note

Vercel Hobby does **not** support cron jobs more frequent than once per day, so true always-on background refresh is not possible on the free plan. Instead, this project uses request-time refresh plus client polling every 5 minutes.

## Local development

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this folder to GitHub
2. Import the repo into Vercel
3. Add `OPENAI_API_KEY` if you want the AI summary
4. Deploy

## Environment variables

```bash
OPENAI_API_KEY=your_key_here
```
