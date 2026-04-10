import { NextRequest, NextResponse } from 'next/server';
import { getIndicatorPayload } from '@/lib/indicator';

export const dynamic = 'force-dynamic';

function fallbackSummary(payload: Awaited<ReturnType<typeof getIndicatorPayload>>) {
  const latest = payload.latest;
  const stats = payload.summaryStats;
  const regime = latest.premiumToNav >= 0 ? 'premium' : 'discount';
  const direction7d = (stats.change7d ?? 0) >= 0 ? 'expanded' : 'narrowed';
  const direction30d = (stats.change30d ?? 0) >= 0 ? 'higher' : 'lower';

  return [
    `${payload.companyName} is currently trading at a ${regime} to its Bitcoin NAV, with the latest Premium to NAV at ${latest.premiumToNav}% and mNAV at ${latest.mnav}x.`,
    `Over the last 7 days, the premium has ${direction7d} by ${Math.abs(stats.change7d ?? 0)} percentage points, while the 30-day average premium stands at ${stats.avg30dPremium ?? 'N/A'}%.`,
    `This suggests that equity investors are pricing ${payload.ticker} ${direction30d} than its look-through BTC value over the past month, which may reflect changing sentiment toward leverage, corporate treasury strategy, or BTC beta exposure.`,
  ].join(' ');
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getIndicatorPayload();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ summary: fallbackSummary(payload), source: 'rule-based' });
    }

    const latest = payload.latest;
    const stats = payload.summaryStats;
    const userInput = await request.json().catch(() => ({}));
    const lookback = userInput.lookbackDays ?? 30;

    const prompt = `You are a financial data assistant. Write a concise 3-4 sentence summary of Strategy's Premium to NAV trend.\nData:\n- Latest premium to NAV: ${latest.premiumToNav}%\n- Latest mNAV: ${latest.mnav}x\n- Latest BTC price: ${latest.btcPrice}\n- Latest MSTR price: ${latest.mstrPrice}\n- 7-day premium change: ${stats.change7d}\n- 30-day premium change: ${stats.change30d}\n- 30-day average premium: ${stats.avg30dPremium}\n- 30-day min premium: ${stats.min30dPremium}\n- 30-day max premium: ${stats.max30dPremium}\n- Holdings source mode: ${payload.holdingsMode}\n- Holdings source: ${payload.holdingsSource}\n- Lookback requested: ${lookback} days\nRules: no financial advice, mention whether premium is expanding or contracting, explain what it may reflect.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'You summarize valuation indicators for dashboards.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ summary: fallbackSummary(payload), source: 'rule-based' });
    }

    const json = await response.json();
    const summary = json?.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({
      summary: summary || fallbackSummary(payload),
      source: summary ? 'openai' : 'rule-based',
    });
  } catch {
    const payload = await getIndicatorPayload().catch(() => null);
    return NextResponse.json({
      summary: payload ? fallbackSummary(payload) : 'Unable to generate summary at the moment.',
      source: 'rule-based',
    });
  }
}
