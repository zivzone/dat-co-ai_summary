export type PricePoint = {
  date: string;
  close: number;
};

export type HoldingPoint = {
  date: string;
  holdings: number;
  source?: string;
};

export type IndicatorPoint = {
  date: string;
  btcPrice: number;
  mstrPrice: number;
  btcHoldings: number;
  nav: number;
  navPerShare: number;
  marketCap: number;
  mnav: number;
  premiumToNav: number;
};

export type IndicatorPayload = {
  companyName: string;
  ticker: string;
  indicatorName: string;
  sharesOutstanding: number;
  generatedAt: string;
  latest: IndicatorPoint;
  summaryStats: {
    change7d: number | null;
    change30d: number | null;
    avg30dPremium: number | null;
    min30dPremium: number | null;
    max30dPremium: number | null;
  };
  priceRefreshSeconds: number;
  holdingsRefreshSeconds: number;
  holdingsSource: string;
  holdingsMode: 'live+seed-fallback' | 'seed-only';
  latestHoldingsDate: string;
  points: IndicatorPoint[];
};
