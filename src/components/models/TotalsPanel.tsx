'use client';

import { ComputedModel, FinancialModel } from '@/types/models';
import { TrendingUp, AlertTriangle, Zap, Clock, Users } from 'lucide-react';
import clsx from 'clsx';

interface TotalsPanelProps {
  model: FinancialModel;
  computed: ComputedModel;
  /** Number of months to summarize over (3/6/12). 0 = full horizon. */
  windowMonths?: number;
}

export function TotalsPanel({ model, computed, windowMonths = 0 }: TotalsPanelProps) {
  const N = computed.monthLabels.length;
  const w = windowMonths > 0 ? Math.min(windowMonths, N) : N;

  const revenue = sumSlice(computed.totalRevenue, w);
  const cost = sumSlice(computed.totalCost, w);
  const profit = sumSlice(computed.profit, w);
  const endingCash = computed.cumulativeCash[w - 1] ?? model.startingCash;

  // Year-1 peak active paying members (first 12 months of the horizon — independent of window)
  const yr1Slice = computed.memberCountPerMonth.slice(0, Math.min(12, N));
  const peakYr1Members = yr1Slice.length > 0 ? Math.max(0, ...yr1Slice) : 0;
  const hasMembers = peakYr1Members > 0;

  // Markers should respect the window when possible (only fire if they occur within it)
  const firstProfit =
    computed.firstProfitableMonth !== null && computed.firstProfitableMonth < w
      ? computed.firstProfitableMonth
      : null;
  const breakEven =
    computed.breakEvenMonth !== null && computed.breakEvenMonth < w ? computed.breakEvenMonth : null;
  const runway =
    computed.runwayMonths !== null && computed.runwayMonths < w ? computed.runwayMonths : null;

  const windowLabel =
    windowMonths === 0 || windowMonths >= N ? `${N} mo` : `${windowMonths} mo`;

  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 flex items-center justify-between">
        <span>Totals · {windowLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Revenue" value={fmt(revenue)} tone="indigo" />
        <Stat label="Cost" value={fmt(cost)} tone="rose" />
        <Stat label="Profit" value={fmt(profit)} tone={profit >= 0 ? 'emerald' : 'rose'} />
        <Stat label="Ending cash" value={fmt(endingCash)} tone={endingCash >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="space-y-1.5">
        <MarkerRow
          icon={<Users className="w-3.5 h-3.5" />}
          label="Members peak (Yr 1)"
          value={hasMembers ? Math.round(peakYr1Members).toLocaleString() : '—'}
          tone={hasMembers ? 'emerald' : 'gray'}
        />
        <MarkerRow
          icon={<Zap className="w-3.5 h-3.5" />}
          label="First profitable month"
          value={firstProfit !== null ? computed.monthLabels[firstProfit] : '—'}
          tone="emerald"
        />
        <MarkerRow
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Break-even month"
          value={breakEven !== null ? computed.monthLabels[breakEven] : '—'}
          tone="emerald"
        />
        <MarkerRow
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Runway"
          value={runway !== null ? `${runway} mo` : '∞'}
          tone={runway !== null && runway < 6 ? 'rose' : 'gray'}
        />
        {endingCash < 0 && (
          <MarkerRow
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="Ends negative"
            value={fmt(endingCash)}
            tone="rose"
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'indigo' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200',
  };
  return (
    <div className={clsx('p-2 rounded-lg', tones[tone])}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function MarkerRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'emerald' | 'rose' | 'gray';
}) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-300',
    rose: 'text-rose-600 dark:text-rose-300',
    gray: 'text-gray-500',
  };
  return (
    <div className="flex items-center justify-between text-xs px-2 py-1 rounded bg-gray-50 dark:bg-gray-800/50">
      <div className={clsx('flex items-center gap-1.5', tones[tone])}>
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-gray-700 dark:text-gray-200">{value}</span>
    </div>
  );
}

function sumSlice(arr: number[], n: number): number {
  let s = 0;
  for (let i = 0; i < Math.min(n, arr.length); i++) s += arr[i];
  return s;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
