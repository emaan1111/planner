'use client';

import { useModels, useModelLines, useModelHeadcount } from '@/hooks/useModelsQuery';
import { useModelsStore } from '@/store/modelsStore';
import { computeModel, ComputedModel, FinancialModel, ModelLine, ModelHeadcount } from '@/types/models';
import clsx from 'clsx';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { useEffect } from 'react';

export function CompareStrip() {
  const { data: models = [] } = useModels();
  const { compareIds, setActiveModel, activeModelId, compareMaximized, setCompareMaximized } = useModelsStore();
  if (compareIds.length === 0) return null;
  const pinned = models.filter((m) => compareIds.includes(m.id));
  return (
    <>
      <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Compare ·</span>
          {pinned.map((m) => (
            <CompareCard
              key={m.id}
              model={m}
              active={m.id === activeModelId}
              onClick={() => setActiveModel(m.id)}
            />
          ))}
          <button
            onClick={() => setCompareMaximized(true)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title="Open detailed comparison"
          >
            <Maximize2 className="w-3 h-3" />
            Maximise
          </button>
        </div>
      </div>
      {compareMaximized && <CompareMaximized models={pinned} onClose={() => setCompareMaximized(false)} />}
    </>
  );
}

function CompareCard({ model, active, onClick }: { model: FinancialModel; active: boolean; onClick: () => void }) {
  const { data: lines = [] } = useModelLines(model.id);
  const { data: headcount = [] } = useModelHeadcount(model.id);
  const computed = computeModel({ model, lines, headcount, placementsByScenario: {} });
  const { projectionWindow } = useModelsStore();
  const w = projectionWindow > 0 ? Math.min(projectionWindow, computed.monthLabels.length) : computed.monthLabels.length;
  const profit = computed.profit.slice(0, w).reduce((s, v) => s + v, 0);
  const ending = computed.cumulativeCash[w - 1] ?? model.startingCash;
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-shrink-0 px-3 py-1.5 rounded border text-left',
        active ? 'border-indigo-500 bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800',
      )}
    >
      <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">{model.name}</div>
      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
        <span className={clsx(profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>P {fmt(profit)}</span>
        <span className="text-gray-400">·</span>
        <span className={clsx(ending >= 0 ? 'text-emerald-600' : 'text-rose-600')}>Cash {fmt(ending)}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Maximised comparison — dockable full-screen modal with side-by-side detail.
// ---------------------------------------------------------------------------

function CompareMaximized({ models, onClose }: { models: FinancialModel[]; onClose: () => void }) {
  const { projectionWindow, setProjectionWindow } = useModelsStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const opts: { v: 3 | 6 | 12 | 0; label: string }[] = [
    { v: 3, label: '3 mo' },
    { v: 6, label: '6 mo' },
    { v: 12, label: '1 yr' },
    { v: 0, label: 'Full' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/40 backdrop-blur-sm flex items-stretch">
      <div className="m-2 sm:m-4 flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Model comparison</h2>
            <div className="flex items-center gap-1 p-1 rounded border border-gray-200 dark:border-gray-700">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 px-1">Window</span>
              {opts.map((o) => (
                <button
                  key={o.v}
                  onClick={() => setProjectionWindow(o.v)}
                  className={
                    'text-[11px] px-2 py-0.5 rounded ' +
                    (projectionWindow === o.v
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800')
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              title="Dock back to strip"
            >
              <Minimize2 className="w-3 h-3" />
              Dock
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {models.map((m) => (
              <CompareColumn key={m.id} model={m} windowMonths={projectionWindow} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareColumn({ model, windowMonths }: { model: FinancialModel; windowMonths: number }) {
  const { data: lines = [] } = useModelLines(model.id);
  const { data: headcount = [] } = useModelHeadcount(model.id);
  const computed = computeModel({ model, lines, headcount, placementsByScenario: {} });
  const N = computed.monthLabels.length;
  const w = windowMonths > 0 ? Math.min(windowMonths, N) : N;

  const revenue = sumSlice(computed.totalRevenue, w);
  const cost = sumSlice(computed.totalCost, w);
  const profit = sumSlice(computed.profit, w);
  const endingCash = computed.cumulativeCash[w - 1] ?? model.startingCash;
  const yr1Slice = computed.memberCountPerMonth.slice(0, Math.min(12, N));
  const peakMembersYr1 = yr1Slice.length > 0 ? Math.max(0, ...yr1Slice) : 0;

  const firstProfit =
    computed.firstProfitableMonth !== null && computed.firstProfitableMonth < w
      ? computed.monthLabels[computed.firstProfitableMonth]
      : '—';
  const breakEven =
    computed.breakEvenMonth !== null && computed.breakEvenMonth < w
      ? computed.monthLabels[computed.breakEvenMonth]
      : '—';
  const runway =
    computed.runwayMonths !== null && computed.runwayMonths < w ? `${computed.runwayMonths} mo` : '∞';

  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{model.name}</h3>
        <span className="text-[10px] uppercase tracking-wide text-gray-400">{model.caseType}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Revenue" value={fmt(revenue)} tone="indigo" />
        <Stat label="Cost" value={fmt(cost)} tone="rose" />
        <Stat label="Profit" value={fmt(profit)} tone={profit >= 0 ? 'emerald' : 'rose'} />
        <Stat label="Ending cash" value={fmt(endingCash)} tone={endingCash >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="space-y-1 text-[11px]">
        <Row label="Members peak (Yr 1)" value={peakMembersYr1 > 0 ? Math.round(peakMembersYr1).toLocaleString() : '—'} />
        <Row label="First profitable" value={firstProfit} />
        <Row label="Break-even" value={breakEven} />
        <Row label="Runway" value={runway} />
        <Row label="Horizon" value={`${N} mo`} />
        <Row label="Starting cash" value={fmt(model.startingCash)} />
      </div>

      <div className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Profit</div>
        <MiniLine values={computed.profit.slice(0, w)} stroke="#10b981" negStroke="#e11d48" />
      </div>
      <div className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Cash balance</div>
        <MiniLine values={computed.cumulativeCash.slice(0, w)} stroke="#6366f1" negStroke="#e11d48" filled />
      </div>

      <TopLines lines={lines} headcount={headcount} computed={computed} windowMonths={w} />
    </div>
  );
}

function TopLines({
  lines,
  headcount,
  computed,
  windowMonths,
}: {
  lines: ModelLine[];
  headcount: ModelHeadcount[];
  computed: ComputedModel;
  windowMonths: number;
}) {
  const rows: { name: string; kind: 'revenue' | 'cost'; total: number }[] = [];
  for (const l of lines) {
    const arr = computed.byLine[l.id] ?? [];
    const total = arr.slice(0, windowMonths).reduce((s, v) => s + v, 0);
    if (total !== 0) rows.push({ name: l.name, kind: l.kind, total });
  }
  for (const h of headcount) {
    const arr = computed.payrollByPerson[h.id] ?? [];
    const total = arr.slice(0, windowMonths).reduce((s, v) => s + v, 0);
    if (total !== 0) rows.push({ name: `${h.name}${h.role ? ` · ${h.role}` : ''}`, kind: 'cost', total });
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  const top = rows.slice(0, 6);

  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Top lines</div>
      <div className="space-y-1">
        {top.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <span className="truncate text-gray-700 dark:text-gray-200">{r.name}</span>
            <span className={r.kind === 'revenue' ? 'text-emerald-600' : 'text-rose-600'}>{fmt(r.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniLine({
  values,
  stroke,
  negStroke,
  filled,
}: {
  values: number[];
  stroke: string;
  negStroke: string;
  filled?: boolean;
}) {
  const w = 240;
  const h = 60;
  if (values.length === 0) return <div className="h-[60px]" />;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const ys = values.map((v) => h - ((v - min) / span) * h);
  const pts = ys.map((y, i) => `${i * stepX},${y}`).join(' ');
  const zeroY = h - ((0 - min) / span) * h;
  const last = values[values.length - 1] ?? 0;
  const color = last >= 0 ? stroke : negStroke;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[60px]">
      <line x1={0} x2={w} y1={zeroY} y2={zeroY} stroke="#e5e7eb" strokeDasharray="2 2" strokeWidth={1} />
      {filled && <polygon points={`0,${zeroY} ${pts} ${w},${zeroY}`} fill={`${color}22`} />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
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
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded bg-white dark:bg-gray-900">
      <span className="text-gray-500">{label}</span>
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
