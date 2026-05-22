'use client';

import { useMemo } from 'react';
import { ComputedModel } from '@/types/models';

interface ModelChartsProps {
  computed: ComputedModel;
  /** Number of months to show. 0 = full horizon. */
  windowMonths?: number;
}

export function ModelCharts({ computed, windowMonths = 0 }: ModelChartsProps) {
  const N = computed.monthLabels.length;
  const w = windowMonths > 0 ? Math.min(windowMonths, N) : N;
  const profit = computed.profit.slice(0, w);
  const cash = computed.cumulativeCash.slice(0, w);
  const labels = computed.monthLabels.slice(0, w);
  return (
    <div className="space-y-3">
      <ChartCard title="Profit per month">
        <LineChart values={profit} labels={labels} colorPos="#10b981" colorNeg="#e11d48" />
      </ChartCard>
      <ChartCard title="Cash balance">
        <LineChart values={cash} labels={labels} colorPos="#6366f1" colorNeg="#e11d48" filled />
      </ChartCard>
      <ChartCard title="Revenue mix">
        <Donut data={computed.revenueByCategory} />
      </ChartCard>
      <ChartCard title="Cost mix">
        <Donut data={computed.costByCategory} />
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-900">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{title}</div>
      {children}
    </div>
  );
}

function LineChart({
  values,
  labels,
  colorPos,
  colorNeg,
  filled,
}: {
  values: number[];
  labels: string[];
  colorPos: string;
  colorNeg: string;
  filled?: boolean;
}) {
  const { points, zeroLineY, width, height, minV, maxV } = useMemo(() => {
    const w = 220;
    const h = 80;
    if (values.length === 0) return { points: '', zeroLineY: h / 2, width: w, height: h, minV: 0, maxV: 0 };
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const span = max - min || 1;
    const stepX = values.length > 1 ? w / (values.length - 1) : 0;
    const ys = values.map((v) => h - ((v - min) / span) * h);
    const pts = ys.map((y, i) => `${i * stepX},${y}`).join(' ');
    const zero = h - ((0 - min) / span) * h;
    return { points: pts, zeroLineY: zero, width: w, height: h, minV: min, maxV: max };
  }, [values]);

  const isPositive = (values[values.length - 1] ?? 0) >= 0;
  const stroke = isPositive ? colorPos : colorNeg;
  const fill = filled ? `${stroke}22` : 'none';

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
        <line x1={0} x2={width} y1={zeroLineY} y2={zeroLineY} stroke="#e5e7eb" strokeDasharray="2 2" strokeWidth={1} />
        {filled && (
          <polygon points={`0,${zeroLineY} ${points} ${width},${zeroLineY}`} fill={fill} />
        )}
        <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} />
      </svg>
      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
      <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
        <span>min {fmtCompact(minV)}</span>
        <span>max {fmtCompact(maxV)}</span>
      </div>
    </div>
  );
}

function Donut({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#a855f7'];

  if (total === 0) return <p className="text-[10px] text-gray-400 italic">No data yet</p>;

  let cumulative = 0;
  const segments = entries.map(([k, v], i) => {
    const start = cumulative / total;
    cumulative += v;
    const end = cumulative / total;
    const startAngle = start * Math.PI * 2 - Math.PI / 2;
    const endAngle = end * Math.PI * 2 - Math.PI / 2;
    const r = 28;
    const cx = 32;
    const cy = 32;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = end - start > 0.5 ? 1 : 0;
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: colors[i % colors.length],
      label: k,
      share: v / total,
      value: v,
    };
  });

  return (
    <div className="flex items-start gap-3">
      <svg viewBox="0 0 64 64" className="w-16 h-16 flex-shrink-0">
        {segments.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="#ffffff" strokeWidth={0.5} />
        ))}
        <circle cx={32} cy={32} r={12} fill="white" className="dark:fill-gray-900" />
      </svg>
      <div className="flex-1 space-y-0.5 text-[10px]">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate text-gray-600 dark:text-gray-300">{s.label}</span>
            <span className="text-gray-500">{(s.share * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n.toFixed(0)}`;
}
