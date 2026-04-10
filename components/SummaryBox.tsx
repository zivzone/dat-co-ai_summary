'use client';

import { useEffect, useState } from 'react';

export function SummaryBox() {
  const [summary, setSummary] = useState<string>('Generating summary...');
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch('/api/summary', { method: 'POST' });
        const json = await response.json();
        if (!cancelled) {
          setSummary(json.summary ?? 'Unable to generate summary.');
          setSource(json.source ?? '');
        }
      } catch {
        if (!cancelled) {
          setSummary('Unable to generate summary.');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">AI / Auto Summary</h3>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
          {source || 'loading'}
        </span>
      </div>
      <p className="text-sm leading-7 text-slate-300">{summary}</p>
    </div>
  );
}
