'use client';

import { useMemo, useState } from 'react';
import { usePlacements, useScenarios } from '@/hooks/useScenariosQuery';
import { computePlacementMetrics, computeRevenue, CoursePlacement } from '@/types/scenarios';
import { useScenariosStore } from '@/store/scenariosStore';
import { TrendingUp, DollarSign, Activity, AlertTriangle, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import { DetailedPnLReport } from './DetailedPnLReport';

function aggregate(placements: CoursePlacement[]) {
  let revenue = 0;
  let cost = 0;
  let profit = 0;
  let expectedValue = 0;
  for (const p of placements) {
    const m = computePlacementMetrics(p);
    revenue += computeRevenue(p);
    cost += m.cost;
    profit += m.profit;
    expectedValue += m.expectedValue;
  }
  return { revenue, cost, profit, expectedValue };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function PnLPanel() {
  const { activeScenarioId } = useScenariosStore();
  const { data: placements = [] } = usePlacements(activeScenarioId ?? undefined);
  const { data: scenarios = [] } = useScenarios();
  const [isReportOpen, setIsReportOpen] = useState(false);

  const totals = useMemo(() => aggregate(placements), [placements]);

  // Comparison strip: aggregate every other scenario for at-a-glance comparison
  // We can only show a value here for scenarios we've fetched placements for.
  // For now, show the active one prominently and a CTA to compare elsewhere.
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);
  const activeBucket = activeScenario?.folderId ?? null;
  // Only compare scenarios in the active scenario's bucket (its folder, or
  // "unfiled" if it has none). Manual selection lives in the detailed report.
  const compareScenarios = useMemo(
    () => scenarios.filter((s) => (s.folderId ?? null) === activeBucket),
    [scenarios, activeBucket],
  );

  // group by month for the current scenario
  const monthly = useMemo(() => {
    const byMonth = new Map<string, { revenue: number; cost: number; profit: number; ev: number }>();
    for (const p of placements) {
      const m = computePlacementMetrics(p);
      const key = `${m.marketingStart.getFullYear()}-${String(m.marketingStart.getMonth() + 1).padStart(2, '0')}`;
      const cur = byMonth.get(key) ?? { revenue: 0, cost: 0, profit: 0, ev: 0 };
      cur.revenue += m.revenue;
      cur.cost += m.cost;
      cur.profit += m.profit;
      cur.ev += m.expectedValue;
      byMonth.set(key, cur);
    }
    return Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [placements]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {activeScenario ? `P&L · ${activeScenario.name}` : 'P&L'}
          </h2>
        </div>
        <button
          onClick={() => setIsReportOpen(true)}
          title="Open detailed report"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-200 dark:border-gray-800">
        <StatCard label="Revenue" value={fmt(totals.revenue)} icon={<DollarSign className="w-3.5 h-3.5" />} tone="indigo" />
        <StatCard label="Cost" value={fmt(totals.cost)} icon={<AlertTriangle className="w-3.5 h-3.5" />} tone="rose" />
        <StatCard label="Profit" value={fmt(totals.profit)} icon={<TrendingUp className="w-3.5 h-3.5" />} tone={totals.profit >= 0 ? 'emerald' : 'rose'} />
        <StatCard label="EV" value={fmt(totals.expectedValue)} icon={<TrendingUp className="w-3.5 h-3.5" />} tone={totals.expectedValue >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">By Month</h3>
        {monthly.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No placements yet.</p>
        ) : (
          <div className="space-y-1">
            {monthly.map(([month, m]) => (
              <div
                key={month}
                className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-gray-50 dark:bg-gray-800"
              >
                <span className="font-medium text-gray-600 dark:text-gray-300">{month}</span>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>R {fmt(m.revenue)}</span>
                  <span>C {fmt(m.cost)}</span>
                  <span className={clsx('font-semibold', m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    P {fmt(m.profit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-400">Compare Scenarios</h3>
          {compareScenarios.length > 1 && (
            <button
              onClick={() => setIsReportOpen(true)}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 font-medium"
              title="See full comparison in the detailed report"
            >
              See full →
            </button>
          )}
        </div>
        <div className="space-y-1">
          {compareScenarios.slice(0, 4).map((s) => (
            <ScenarioCompareRow key={s.id} scenarioId={s.id} name={s.name} isActive={s.id === activeScenarioId} />
          ))}
          {compareScenarios.length > 4 && (
            <button
              onClick={() => setIsReportOpen(true)}
              className="w-full text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 italic py-1"
            >
              +{compareScenarios.length - 4} more · open detailed report
            </button>
          )}
          {compareScenarios.length <= 1 && (
            <p className="text-xs text-gray-400 italic">
              {scenarios.length <= 1
                ? 'No scenarios to compare.'
                : 'No other scenarios in this folder — open detailed report to pick scenarios.'}
            </p>
          )}
        </div>

        <button
          onClick={() => setIsReportOpen(true)}
          className="w-full mt-4 text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium inline-flex items-center justify-center gap-2 shadow-sm"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Open detailed report
        </button>
      </div>

      <DetailedPnLReport open={isReportOpen} onClose={() => setIsReportOpen(false)} />
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: 'indigo' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200',
  };
  return (
    <div className={clsx('p-2 rounded-lg', tones[tone])}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function ScenarioCompareRow({ scenarioId, name, isActive }: { scenarioId: string; name: string; isActive: boolean }) {
  const { data: placements = [] } = usePlacements(scenarioId);
  const totals = aggregate(placements);
  return (
    <div
      className={clsx(
        'flex items-center justify-between text-xs px-2 py-1.5 rounded',
        isActive ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-gray-50 dark:bg-gray-800',
      )}
    >
      <span className={clsx('font-medium truncate', isActive && 'text-indigo-700 dark:text-indigo-200')}>
        {name}
      </span>
      <div className="flex items-center gap-2 text-gray-500">
        <span className={clsx('font-semibold', totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
          P {fmt(totals.profit)}
        </span>
        <span className={clsx(totals.expectedValue >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
          EV {fmt(totals.expectedValue)}
        </span>
      </div>
    </div>
  );
}
