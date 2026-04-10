import holdingsSeed from '@/data/strategy-holdings.json';
import { HoldingPoint, IndicatorPayload, IndicatorPoint, PricePoint } from './types';

const SHARES_OUTSTANDING = 292_000_000;
const COMPANY_NAME = 'Strategy';
const TICKER = 'MSTR';
const INDICATOR_NAME = 'Premium to NAV';
const PRICE_REFRESH_SECONDS = 300;
const HOLDINGS_REFRESH_SECONDS = 300;
const STRATEGY_PURCHASES_URL = 'https://www.strategy.com/purchases';
const STRATEGY_HISTORY_URL = 'https://www.strategy.com/history';

type LatestHoldingsResult = {
  holdings: number;
  reportedDate: string;
  sourceUrl: string;
  mode: 'live+seed-fallback' | 'seed-only';
};

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
    next: { revalidate: PRICE_REFRESH_SECONDS },
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

async function fetchYahooLatest(symbol: string): Promise<PricePoint | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=5m&includePrePost=false&events=div%2Csplits`;
  const response = await fetch(url, {
    next: { revalidate: PRICE_REFRESH_SECONDS },
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? [];

  for (let i = timestamps.length - 1; i >= 0; i -= 1) {
    const close = closes[i];
    if (close == null || Number.isNaN(close)) continue;

    return {
      date: formatDateUTC(new Date(timestamps[i] * 1000)),
      close: Number(close),
    };
  }

  return null;
}

function mergeLatestPrice(daily: PricePoint[], latest: PricePoint | null): PricePoint[] {
  if (!latest) return daily;
  const map = new Map(daily.map((point) => [point.date, point.close]));
  map.set(latest.date, latest.close);

  return Array.from(map.entries())
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeWhitespace(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function monthNameToNumber(month: string): number {
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  return months.indexOf(month.toLowerCase()) + 1;
}

function parseDateFromText(html: string): string | null {
  const text = normalizeWhitespace(html);
  const numeric = text.match(/(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (numeric) {
    const [, y, m, d] = numeric;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const written = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})\b/i);
  if (written) {
    const [, monthName, day, year] = written;
    return `${year}-${String(monthNameToNumber(monthName)).padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

function parseLargestBitcoinHolding(html: string): number | null {
  const normalized = normalizeWhitespace(html);
  const candidates = new Set<number>();

  for (const match of normalized.matchAll(/(?:holds?|holdings|bitcoin(?:s)? held|btc(?: holdings)?)\D{0,40}(\d{1,3}(?:,\d{3})+|\d{4,})/gi)) {
    candidates.add(Number(match[1].replace(/,/g, '')));
  }

  for (const match of normalized.matchAll(/₿\s?(\d{1,3}(?:,\d{3})+|\d{4,})/g)) {
    candidates.add(Number(match[1].replace(/,/g, '')));
  }

  const plausible = Array.from(candidates).filter((value) => Number.isFinite(value) && value > 100_000 && value < 5_000_000);
  if (!plausible.length) return null;

  return Math.max(...plausible);
}

async function fetchStrategyLatestHoldings(seedData: HoldingPoint[]): Promise<LatestHoldingsResult> {
  const latestSeed = [...seedData].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const seedFallback: LatestHoldingsResult = {
    holdings: latestSeed?.holdings ?? 0,
    reportedDate: latestSeed?.date ?? formatDateUTC(new Date()),
    sourceUrl: 'Local seed fallback',
    mode: 'seed-only',
  };

  const urls = [STRATEGY_PURCHASES_URL, STRATEGY_HISTORY_URL];
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url, {
        next: { revalidate: HOLDINGS_REFRESH_SECONDS },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Strategy holdings from ${url}: ${response.status}`);
      }

      const html = await response.text();
      const holdings = parseLargestBitcoinHolding(html);
      const reportedDate = parseDateFromText(html) ?? formatDateUTC(new Date());

      if (!holdings) {
        throw new Error(`Unable to parse Strategy holdings from ${url}`);
      }

      return { holdings, reportedDate, sourceUrl: url };
    }),
  );

  const liveCandidates = results
    .filter((item): item is PromiseFulfilledResult<{ holdings: number; reportedDate: string; sourceUrl: string }> => item.status === 'fulfilled')
    .map((item) => item.value)
    .filter((item) => item.holdings >= seedFallback.holdings);

  if (!liveCandidates.length) {
    return seedFallback;
  }

  liveCandidates.sort((a, b) => b.holdings - a.holdings || b.reportedDate.localeCompare(a.reportedDate));
  const best = liveCandidates[0];

  return {
    holdings: best.holdings,
    reportedDate: best.reportedDate,
    sourceUrl: best.sourceUrl,
    mode: 'live+seed-fallback',
  };
}

function buildHoldingsMap(dates: string[], seedData: HoldingPoint[], latestHoldings: LatestHoldingsResult): Map<string, number> {
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

  const liveDate = latestHoldings.reportedDate;
  const latestSeedDate = sortedSeed.at(-1)?.date ?? '';

  if (liveDate >= latestSeedDate && latestHoldings.holdings >= (sortedSeed.at(-1)?.holdings ?? 0)) {
    for (const date of dates) {
      if (date >= liveDate) {
        map.set(date, latestHoldings.holdings);
      }
    }

    const lastDate = dates.at(-1);
    if (lastDate && liveDate > lastDate) {
      map.set(liveDate, latestHoldings.holdings);
    }
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
  const seedData = holdingsSeed as HoldingPoint[];
  const [btcDaily, mstrDaily, btcLatest, mstrLatest, latestHoldings] = await Promise.all([
    fetchYahooSeries('BTC-USD', '1y'),
    fetchYahooSeries(TICKER, '1y'),
    fetchYahooLatest('BTC-USD'),
    fetchYahooLatest(TICKER),
    fetchStrategyLatestHoldings(seedData),
  ]);

  const btc = mergeLatestPrice(btcDaily, btcLatest);
  const mstr = mergeLatestPrice(mstrDaily, mstrLatest);

  const btcMap = toMap(btc);
  const mstrMap = toMap(mstr);
  const allDates = new Set([...btcMap.keys(), ...mstrMap.keys()]);
  const dates = Array.from(allDates)
    .filter((date) => btcMap.has(date) && mstrMap.has(date))
    .sort((a, b) => a.localeCompare(b))
    .slice(-days);

  const holdingsMap = buildHoldingsMap(dates, seedData, latestHoldings);

  const points: IndicatorPoint[] = dates.map((date) => {
    const btcPrice = btcMap.get(date)!;
    const mstrPrice = mstrMap.get(date)!;
    const btcHoldings = holdingsMap.get(date) ?? latestHoldings.holdings;
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
    summaryStats: buildSummaryStats(points),
    latest,
    priceRefreshSeconds: PRICE_REFRESH_SECONDS,
    holdingsRefreshSeconds: HOLDINGS_REFRESH_SECONDS,
    holdingsSource: latestHoldings.sourceUrl,
    holdingsMode: latestHoldings.mode,
    latestHoldingsDate: latestHoldings.reportedDate,
    points,
  };
}
