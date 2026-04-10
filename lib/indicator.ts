import holdingsSeed from '@/data/strategy-holdings.json';
import { HoldingPoint, IndicatorPayload, IndicatorPoint, PricePoint } from './types';

const SHARES_OUTSTANDING = 292_000_000;
const COMPANY_NAME = 'Strategy';
const TICKER = 'MSTR';
const INDICATOR_NAME = 'Premium to NAV';

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function generateDailyDates(days: number): string[] {
  const result: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - i);
    result.push(formatDateUTC(d));
  }

  return result;
}

async function fetchYahooSeries(symbol: string, range = '1y'): Promise<PricePoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d&includePrePost=false&events=div%2Csplits`;
  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 6 },
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${symbol} prices: ${response.status}`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? [];

  const points: PricePoint[] = [];

  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i];
    if (close == null || Number.isNaN(close)) continue;

    points.push({
      date: formatDateUTC(new Date(timestamps[i] * 1000)),
      close: Number(close),
    });
  }

  return points;
}

function buildHoldingsMap(dates: string[], seedData: HoldingPoint[]): Map<string, number> {
  const sortedSeed = [...seedData].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<string, number>();
  let currentHoldings = sortedSeed[0]?.holdings ?? 0;
  let seedIndex = 0;

  for (const date of dates) {
    while (seedIndex < sortedSeed.length && sortedSeed[seedIndex].date <= date) {
      currentHoldings = sortedSeed[seedIndex].holdings;
      seedIndex += 1;
    }
    map.set(date, currentHoldings);
  }

  return map;
}

function toMap(points: PricePoint[]): Map<string, number> {
  return new Map(points.map((point) => [point.date, point.close]));
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function buildSummaryStats(points: IndicatorPoint[]) {
  const latest = points.at(-1);
  if (!latest) {
    return {
      change7d: null,
      change30d: null,
      avg30dPremium: null,
      min30dPremium: null,
      max30dPremium: null,
    };
  }

  const point7d = points.at(-8);
  const point30d = points.at(-31);
  const last30 = points.slice(-30);

  return {
    change7d: point7d ? round(latest.premiumToNav - point7d.premiumToNav) : null,
    change30d: point30d ? round(latest.premiumToNav - point30d.premiumToNav) : null,
    avg30dPremium: last30.length ? round(last30.reduce((sum, p) => sum + p.premiumToNav, 0) / last30.length) : null,
    min30dPremium: last30.length ? round(Math.min(...last30.map((p) => p.premiumToNav))) : null,
    max30dPremium: last30.length ? round(Math.max(...last30.map((p) => p.premiumToNav))) : null,
  };
}

export async function getIndicatorPayload(days = 365): Promise<IndicatorPayload> {
  const [btc, mstr] = await Promise.all([
    fetchYahooSeries('BTC-USD', '1y'),
    fetchYahooSeries(TICKER, '1y'),
  ]);

  const btcMap = toMap(btc);
  const mstrMap = toMap(mstr);
  const dates = generateDailyDates(days).filter((date) => btcMap.has(date) && mstrMap.has(date));
  const holdingsMap = buildHoldingsMap(dates, holdingsSeed as HoldingPoint[]);

  const points: IndicatorPoint[] = dates.map((date) => {
    const btcPrice = btcMap.get(date)!;
    const mstrPrice = mstrMap.get(date)!;
    const btcHoldings = holdingsMap.get(date) ?? 0;
    const nav = btcHoldings * btcPrice;
    const navPerShare = nav / SHARES_OUTSTANDING;
    const marketCap = mstrPrice * SHARES_OUTSTANDING;
    const mnav = navPerShare > 0 ? mstrPrice / navPerShare : 0;
    const premiumToNav = (mnav - 1) * 100;

    return {
      date,
      btcPrice: round(btcPrice),
      mstrPrice: round(mstrPrice),
      btcHoldings,
      nav: round(nav, 0),
      navPerShare: round(navPerShare),
      marketCap: round(marketCap, 0),
      mnav: round(mnav),
      premiumToNav: round(premiumToNav),
    };
  });

  const latest = points.at(-1);
  if (!latest) {
    throw new Error('No overlapping BTC/MSTR data points were found.');
  }

  return {
    companyName: COMPANY_NAME,
    ticker: TICKER,
    indicatorName: INDICATOR_NAME,
    sharesOutstanding: SHARES_OUTSTANDING,
    generatedAt: new Date().toISOString(),
    latest,
    summaryStats: buildSummaryStats(points),
    points,
  };
}
