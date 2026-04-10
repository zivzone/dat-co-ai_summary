'use client';

import { useEffect, useMemo, useState } from 'react';
import { IndicatorChart } from '@/components/IndicatorChart';
import { MetricCard } from '@/components/MetricCard';
import { SummaryBox } from '@/components/SummaryBox';
import { IndicatorPayload } from '@/lib/types';

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsd2(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function DashboardClient({ initialPayload }: { initialPayload: IndicatorPayload }) {
  const [payload, setPayload] = useState<IndicatorPayload>(initialPayload);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setPayload(initialPayload);
  }, [initialPayload]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        setIsRefreshing(true);
        const response = await fetch('/api/indicator', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to refresh indicator payload');
        }
        const json = (await response.json()) as IndicatorPayload;
        if (!cancelled) {
          setPayload(json);
        }
      } catch {
        // Keep the previous payload if refresh fails.
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    const intervalMs = payload.priceRefreshSeconds * 1000;
    const intervalId = window.setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [payload.priceRefreshSeconds]);

  const latest = payload.latest;
  const recent90 = useMemo(() => payload.points.slice(-90), [payload.points]);
  const autoRefreshText = `${Math.round(payload.priceRefreshSeconds / 60)} min auto-refresh`;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              DAT.co Assignment Demo
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">{payload.companyName} Premium to NAV Monitor</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              This dashboard automatically refreshes BTC and MSTR prices every 5 minutes via Yahoo Finance and checks
              Strategy&apos;s official holdings pages on the same cadence. On Vercel Hobby, the refresh happens when the
              site is visited or kept open, which is the closest free-hosting equivalent to near-real-time updates.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Last updated: {new Date(payload.generatedAt).toLocaleString('en-US', { hour12: false })}
            <br />
            Status: {isRefreshing ? 'Refreshing…' : autoRefreshText}
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Latest Premium to NAV" value={`${latest.premiumToNav}%`} subtext={`${latest.mnav}x mNAV`} />
          <MetricCard label="BTC Price" value={formatUsd2(latest.btcPrice)} subtext="Yahoo Finance 5-minute refresh" />
          <MetricCard label="MSTR Price" value={formatUsd2(latest.mstrPrice)} subtext="Yahoo Finance 5-minute refresh" />
          <MetricCard
            label="BTC Holdings"
            value={latest.btcHoldings.toLocaleString('en-US')}
            subtext={`${payload.holdingsMode === 'live+seed-fallback' ? 'Strategy live check' : 'Seed fallback'} · as of ${payload.latestHoldingsDate}`}
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <IndicatorChart data={recent90} dataKey="premiumToNav" title="Premium to NAV (Last 90 Days)" yLabel="%" />
          <SummaryBox refreshSeconds={payload.priceRefreshSeconds} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <IndicatorChart data={recent90} dataKey="mnav" title="mNAV (Last 90 Days)" yLabel="x" />
          <IndicatorChart data={recent90} dataKey="btcPrice" title="BTC Price (Last 90 Days)" yLabel="USD" />
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Indicator methodology</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm leading-7 text-slate-300">
                <strong>Indicator:</strong> Premium to NAV
                <br />
                <strong>Formula:</strong> mNAV = Market Cap / NAV, Premium to NAV = (mNAV - 1) × 100
                <br />
                <strong>NAV:</strong> BTC Holdings × BTC Price
              </p>
            </div>
            <div>
              <p className="text-sm leading-7 text-slate-300">
                <strong>Latest NAV:</strong> {formatUsd(latest.nav)}
                <br />
                <strong>Latest Market Cap:</strong> {formatUsd(latest.marketCap)}
                <br />
                <strong>Assumed shares outstanding:</strong> {payload.sharesOutstanding.toLocaleString('en-US')}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Data notes</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>• BTC and MSTR are re-fetched from Yahoo Finance server-side with a 300-second cache window.</li>
            <li>• The page also polls the indicator API every 5 minutes while the browser tab is open.</li>
            <li>• Strategy holdings are checked against the official purchases/history pages every 5 minutes, then merged with the seeded historical series.</li>
            <li>• On Vercel Hobby, true background cron execution every 5 minutes is not available, so updates occur on request rather than via always-on workers.</li>
            <li>• The AI summary works without an API key using a rule-based fallback, and upgrades automatically if OPENAI_API_KEY is set.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
