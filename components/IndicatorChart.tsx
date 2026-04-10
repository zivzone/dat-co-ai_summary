'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { IndicatorPoint } from '@/lib/types';

function formatCompactDate(date: string) {
  return date.slice(5);
}

export function IndicatorChart({
  data,
  dataKey,
  title,
  yLabel,
}: {
  data: IndicatorPoint[];
  dataKey: keyof IndicatorPoint;
  title: string;
  yLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400">Daily frequency</p>
      </div>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatCompactDate}
              minTickGap={32}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              stroke="rgba(255,255,255,0.12)"
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              stroke="rgba(255,255,255,0.12)"
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip
              contentStyle={{
                background: '#020617',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
              }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Line type="monotone" dataKey={dataKey as string} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
