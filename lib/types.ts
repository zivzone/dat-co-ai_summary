export type PricePoint = {
  date: string;
  close: number;
};

export type HoldingPoint = {
  date: string;
  holdings: number;
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
  points: IndicatorPoint[];
};
