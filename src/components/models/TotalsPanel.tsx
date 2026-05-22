'use client';

import { ComputedModel, FinancialModel } from '@/types/models';
import { TrendingUp, AlertTriangle, Zap, Clock } from 'lucide-react';
import clsx from 'clsx';

interface TotalsPanelProps {
  model: FinancialModel;
  computed: ComputedModel;
}

export function TotalsPanel({ model, computed }: TotalsPanelProps) {
  const revenue = sum(computed.totalRevenue);
  const cost = sum(computed.totalCost);
  const profit = sum(computed.profit);
  const endingCash = computed.cumulativeCash[computed.cumulativeCash.length - 1] ?? model.startingCash;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Revenue" value={fmt(revenue)} tone="indigo" />
        <Stat label="Cost" value={fmt(cost)} tone="rose" />
        <Stat label="Profit" value={fmt(profit)} tone={profit >= 0 ? 'emerald' : 'rose'} />
        <Stat label="Ending cash" value={fmt(endingCash)} tone={endingCash >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="space-y-1.5">
        <MarkerRow
          icon={<Zap className="w-3.5 h-3.5" />}
          label="First profitable month"
          value={computed.firstProfitableMonth !== null ? computed.monthLabels[computed.firstProfitableMonth] : '—'}
          tone="emerald"
        />
        <MarkerRow
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Break-even month"
          value={computed.breakEvenMonth !== null ? computed.monthLabels[computed.breakEvenMonth] : '—'}
          tone="emerald"
        />
        <MarkerRow
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Runway"
          value={computed.runwayMonths !== null ? `${computed.runwayMonths} mo` : '∞'}
          tone={computed.runwayMonths !== null && computed.runwayMonths < 6 ? 'rose' : 'gray'}
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

function sum(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0);
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
