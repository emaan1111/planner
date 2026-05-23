'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useScenariosStore } from '@/store/scenariosStore';
import { usePlacements, useScenarios, useScenarioFolders } from '@/hooks/useScenariosQuery';
import {
  computePlacementMetrics,
  computeRevenue,
  membershipRevenueStream,
  riskLevel,
  likelihoodLevel,
  CoursePlacement,
  effectiveCohort,
  effectivePrice,
  effectiveChurn,
} from '@/types/scenarios';
import { X, TrendingUp, AlertTriangle, Users, GitCompare, ChevronUp, ChevronDown, SlidersHorizontal, Check, Folder } from 'lucide-react';
import clsx from 'clsx';

interface DetailedPnLReportProps {
  open: boolean;
  onClose: () => void;
}

export function DetailedPnLReport({ open, onClose }: DetailedPnLReportProps) {
  const { activeScenarioId } = useScenariosStore();
  const { data: scenarios = [] } = useScenarios();
  const { data: folders = [] } = useScenarioFolders();
  const scenario = scenarios.find((s) => s.id === activeScenarioId);
  const { data: placements = [] } = usePlacements(activeScenarioId ?? undefined);

  const report = useMemo(() => buildReport(placements), [placements]);

  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [initialPos, setInitialPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!open || initialPos || typeof window === 'undefined') return;
    const w = Math.min(1100, window.innerWidth * 0.96);
    setInitialPos({
      left: Math.max(8, (window.innerWidth - w) / 2),
      top: Math.max(8, window.innerHeight * 0.06),
    });
  }, [open, initialPos]);

  const dragControls = useDragControls();

  if (!open || !mounted) return null;

  const panelClass = isDesktop
    ? 'pointer-events-auto fixed bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col'
    : 'bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-[1100px] max-w-[96vw] max-h-[92vh] overflow-hidden flex flex-col';

  const panelStyle: React.CSSProperties = isDesktop
    ? {
        left: initialPos?.left ?? 100,
        top: initialPos?.top ?? 60,
        width: 1100,
        height: '82vh',
        maxWidth: '96vw',
        maxHeight: '92vh',
        minWidth: 480,
        minHeight: 320,
        resize: 'both',
        overflow: 'hidden',
      }
    : {};

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={clsx(
          'fixed inset-0 z-[60]',
          isDesktop
            ? 'pointer-events-none'
            : 'bg-black/40 flex items-center justify-center',
        )}
        onClick={isDesktop ? undefined : onClose}
      >
        <motion.div
          drag={isDesktop}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={panelClass}
          style={panelStyle}
        >
          <header
            onPointerDown={(e) => {
              if (!isDesktop) return;
              if ((e.target as HTMLElement).closest('button')) return;
              dragControls.start(e);
            }}
            className={clsx(
              'px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between select-none',
              isDesktop && 'cursor-move',
            )}
          >
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Detailed P&L · {scenario?.name ?? 'Scenario'}
              </h2>
              <p className="text-xs text-gray-500">
                {placements.length} placement{placements.length === 1 ? '' : 's'} · 12-month projection
                {isDesktop && <span className="ml-2 text-gray-400">· drag header to move · drag corner to resize</span>}
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {/* Headline totals */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <Stat label="Revenue" value={fmt(report.totals.revenue)} tone="indigo" />
              <Stat label="Cost" value={fmt(report.totals.cost)} tone="rose" />
              <Stat label="Profit" value={fmt(report.totals.profit)} tone={report.totals.profit >= 0 ? 'emerald' : 'rose'} />
              <Stat label="EV" value={fmt(report.totals.expectedValue)} tone={report.totals.expectedValue >= 0 ? 'emerald' : 'rose'} />
              <Stat label="Members yr 1" value={`${Math.round(report.totals.membersYear1)}`} tone="indigo" />
            </section>

            {/* Scenario comparison — scoped to active scenario's folder by default.
                Keyed by the active bucket so the user's custom selection resets when
                they switch to a scenario in a different folder. */}
            {scenarios.length > 1 && (
              <ScenarioCompareSection
                key={scenario?.folderId ?? 'unfiled'}
                scenarios={scenarios}
                folders={folders}
                activeScenarioId={activeScenarioId ?? null}
              />
            )}

            {/* Per-course breakdown */}
            <section>
              <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Per course</h3>
              <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <Th>Course</Th>
                      <Th>Type</Th>
                      <Th>Regs</Th>
                      <Th>Revenue</Th>
                      <Th>Cost</Th>
                      <Th>Profit</Th>
                      <Th>EV</Th>
                      <Th>Likelihood</Th>
                      <Th>Risk</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.perCourse.map((row) => (
                      <tr key={row.placementId} className="border-t border-gray-100 dark:border-gray-800">
                        <Td className="font-medium">
                          {row.courseName}
                          {row.isMembership && (
                            <span className="ml-1 text-[9px] uppercase bg-amber-100 text-amber-700 px-1 py-0.5 rounded">
                              {row.entryMode === 'trial-to-paid' ? 'Trial→Paid' : 'Direct'}
                            </span>
                          )}
                        </Td>
                        <Td>{row.isMembership ? 'Membership' : 'One-off'}</Td>
                        <Td>{row.registrations}</Td>
                        <Td>{fmt(row.revenue)}</Td>
                        <Td>{fmt(row.cost)}</Td>
                        <Td className={clsx(row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600', 'font-semibold')}>
                          {fmt(row.profit)}
                        </Td>
                        <Td className={clsx(row.ev >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{fmt(row.ev)}</Td>
                        <Td>
                          <LikelihoodPill level={row.likelihoodLevel} percent={row.likelihoodPercent} />
                        </Td>
                        <Td>
                          <RiskPill level={row.riskLevel} />
                        </Td>
                      </tr>
                    ))}
                    {report.perCourse.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-gray-400 italic py-4">
                          No placements yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Per-month rollup */}
            <section>
              <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">By month (next 12 months)</h3>
              <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <Th>Month</Th>
                      <Th>New regs</Th>
                      <Th>Active members</Th>
                      <Th>Revenue</Th>
                      <Th>Cost</Th>
                      <Th>Profit</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.perMonth.map((row) => (
                      <tr key={row.month} className="border-t border-gray-100 dark:border-gray-800">
                        <Td className="font-medium">{row.month}</Td>
                        <Td>{row.newRegistrations}</Td>
                        <Td>{Math.round(row.activeMembers)}</Td>
                        <Td>{fmt(row.revenue)}</Td>
                        <Td>{fmt(row.cost)}</Td>
                        <Td className={clsx(row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600', 'font-semibold')}>
                          {fmt(row.profit)}
                        </Td>
                      </tr>
                    ))}
                    {report.perMonth.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-400 italic py-4">
                          Nothing scheduled
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Membership 12-month detail (one block per membership placement) */}
            {report.memberships.length > 0 && (
              <section>
                <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Membership projections
                </h3>
                <div className="space-y-4">
                  {report.memberships.map((m) => (
                    <div
                      key={m.placementId}
                      className="rounded border border-gray-200 dark:border-gray-800 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-200">{m.courseName}</span>
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-500">
                            {m.entryMode === 'trial-to-paid' ? 'Trial → Paid' : 'Direct entry'} · {Math.round(m.cohort)} cohort · {m.churn}% churn · ${m.price}/period
                          </span>
                          {m.usingTemplateDefault && (
                            <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-300">
                              · using template default cohort
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Lifetime revenue: <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(m.lifetimeRevenue)}</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-white dark:bg-gray-900 text-gray-400">
                            <tr>
                              <Th>Period</Th>
                              <Th>Date</Th>
                              <Th>Trial</Th>
                              <Th>New paid</Th>
                              <Th>Active</Th>
                              <Th>Churned</Th>
                              <Th>Revenue</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.stream.slice(0, 12).map((row) => (
                              <tr key={row.periodIndex} className="border-t border-gray-100 dark:border-gray-800">
                                <Td>{row.periodIndex + 1}</Td>
                                <Td>{row.date.toLocaleDateString(undefined, { year: '2-digit', month: 'short' })}</Td>
                                <Td>{Math.round(row.trialMembers)}</Td>
                                <Td>{Math.round(row.newPaidMembers)}</Td>
                                <Td className="font-medium">{Math.round(row.activePaidMembers)}</Td>
                                <Td className="text-rose-500">{Math.round(row.churnedMembers)}</Td>
                                <Td className="font-semibold">{fmt(row.revenue)}</Td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Risk register */}
            {report.risks.length > 0 && (
              <section>
                <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" /> Risk register
                </h3>
                <div className="space-y-2">
                  {report.risks.map((r) => (
                    <div key={r.placementId} className="rounded border border-gray-200 dark:border-gray-800 p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{r.courseName}</span>
                        <RiskPill level={r.riskLevel} />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{r.risks}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

interface Report {
  totals: { revenue: number; cost: number; profit: number; expectedValue: number; membersYear1: number };
  perCourse: Array<{
    placementId: string;
    courseName: string;
    isMembership: boolean;
    entryMode: 'direct' | 'trial-to-paid';
    registrations: number;
    revenue: number;
    cost: number;
    profit: number;
    ev: number;
    likelihoodPercent: number;
    likelihoodLevel: ReturnType<typeof likelihoodLevel>;
    riskLevel: ReturnType<typeof riskLevel>;
  }>;
  perMonth: Array<{
    month: string;
    newRegistrations: number;
    activeMembers: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  memberships: Array<{
    placementId: string;
    courseName: string;
    entryMode: 'direct' | 'trial-to-paid';
    churn: number;
    price: number;
    cohort: number;
    usingTemplateDefault: boolean;
    lifetimeRevenue: number;
    stream: ReturnType<typeof membershipRevenueStream>;
  }>;
  risks: Array<{ placementId: string; courseName: string; riskLevel: ReturnType<typeof riskLevel>; risks: string }>;
}

function buildReport(placements: CoursePlacement[]): Report {
  const perCourse: Report['perCourse'] = [];
  const memberships: Report['memberships'] = [];
  const risks: Report['risks'] = [];
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalEV = 0;
  let membersYear1 = 0;

  for (const p of placements) {
    const m = computePlacementMetrics(p);
    const rev = computeRevenue(p);
    perCourse.push({
      placementId: p.id,
      courseName: p.courseTemplate?.name ?? 'Course',
      isMembership: p.isMembership,
      entryMode: p.entryMode,
      registrations: p.projectedRegistrations,
      revenue: rev,
      cost: m.cost,
      profit: m.profit,
      ev: m.expectedValue,
      likelihoodPercent: p.likelihoodPercent,
      likelihoodLevel: likelihoodLevel(p),
      riskLevel: riskLevel(p),
    });
    totalRevenue += rev;
    totalCost += m.cost;
    totalProfit += m.profit;
    totalEV += m.expectedValue;

    if (p.isMembership) {
      const stream = membershipRevenueStream(p);
      const lifetime = stream.reduce((s, r) => s + r.revenue, 0);
      memberships.push({
        placementId: p.id,
        courseName: p.courseTemplate?.name ?? 'Course',
        entryMode: p.entryMode,
        churn: effectiveChurn(p),
        price: effectivePrice(p),
        cohort: effectiveCohort(p),
        usingTemplateDefault: p.projectedRegistrations <= 0,
        lifetimeRevenue: lifetime,
        stream,
      });
      const first12 = stream.slice(0, 12);
      membersYear1 += first12.reduce((s, r) => s + r.activePaidMembers, 0) / Math.max(1, first12.length);
    } else {
      membersYear1 += p.projectedRegistrations;
    }

    if ((p.risks ?? '').trim().length > 0) {
      risks.push({
        placementId: p.id,
        courseName: p.courseTemplate?.name ?? 'Course',
        riskLevel: riskLevel(p),
        risks: p.risks!,
      });
    }
  }

  // Per-month rollup over the next 12 months
  const now = new Date();
  const monthBuckets: Record<string, { newRegistrations: number; activeMembers: number; revenue: number; cost: number; profit: number }> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthBuckets[monthKey(d)] = { newRegistrations: 0, activeMembers: 0, revenue: 0, cost: 0, profit: 0 };
  }

  for (const p of placements) {
    const m = computePlacementMetrics(p);
    // One-off: book all revenue/cost into delivery-start month
    const deliveryMonth = monthKey(m.deliveryStart);
    if (!p.isMembership && monthBuckets[deliveryMonth]) {
      monthBuckets[deliveryMonth].newRegistrations += p.projectedRegistrations;
      monthBuckets[deliveryMonth].revenue += computeRevenue(p);
      monthBuckets[deliveryMonth].cost += m.cost;
      monthBuckets[deliveryMonth].profit += m.profit;
    } else if (p.isMembership) {
      const stream = membershipRevenueStream(p);
      // Book cost into delivery start; revenue & active per period
      if (monthBuckets[deliveryMonth]) {
        monthBuckets[deliveryMonth].cost += m.cost;
        monthBuckets[deliveryMonth].newRegistrations += p.projectedRegistrations;
      }
      for (const row of stream) {
        const k = monthKey(row.date);
        if (monthBuckets[k]) {
          monthBuckets[k].revenue += row.revenue;
          monthBuckets[k].activeMembers += row.activePaidMembers;
        }
      }
    }
  }

  // Recompute profit per month after revenue/cost
  const perMonth = Object.entries(monthBuckets).map(([month, agg]) => ({
    month,
    newRegistrations: agg.newRegistrations,
    activeMembers: agg.activeMembers,
    revenue: agg.revenue,
    cost: agg.cost,
    profit: agg.revenue - agg.cost,
  }));

  return {
    totals: { revenue: totalRevenue, cost: totalCost, profit: totalProfit, expectedValue: totalEV, membersYear1 },
    perCourse,
    perMonth,
    memberships,
    risks,
  };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-medium">{children}</th>;
}
function Td({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={clsx('px-3 py-2', className)} title={title}>
      {children}
    </td>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'indigo' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200',
  };
  return (
    <div className={clsx('p-3 rounded-lg', tones[tone])}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function LikelihoodPill({ level, percent }: { level: ReturnType<typeof likelihoodLevel>; percent: number }) {
  const tones: Record<string, string> = {
    'very-likely': 'bg-emerald-100 text-emerald-700',
    likely: 'bg-emerald-50 text-emerald-600',
    possible: 'bg-amber-50 text-amber-700',
    unlikely: 'bg-rose-50 text-rose-600',
  };
  return (
    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide', tones[level])}>
      {level.replace('-', ' ')} ({percent}%)
    </span>
  );
}

type CompareSortKey =
  | 'name'
  | 'placements'
  | 'members'
  | 'revenue6mo'
  | 'revenue12mo'
  | 'revenue'
  | 'cost'
  | 'profit'
  | 'ev';

type CompareRowStats = ReturnType<typeof computeScenarioCompareStats> & { placements: number };

function ScenarioCompareSection({
  scenarios,
  folders,
  activeScenarioId,
}: {
  scenarios: { id: string; name: string; folderId?: string }[];
  folders: { id: string; name: string }[];
  activeScenarioId: string | null;
}) {
  const [sortKey, setSortKey] = useState<CompareSortKey>('profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statsById, setStatsById] = useState<Record<string, CompareRowStats>>({});
  // null = use the default folder-scoped selection. A Set means the user has
  // overridden the selection explicitly via the picker.
  const [customSelection, setCustomSelection] = useState<Set<string> | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const active = scenarios.find((s) => s.id === activeScenarioId);
  const activeBucket = active?.folderId ?? null;

  const defaultSelectedIds = useMemo(
    () =>
      new Set(
        scenarios.filter((s) => (s.folderId ?? null) === activeBucket).map((s) => s.id),
      ),
    [scenarios, activeBucket],
  );

  const selectedIds = customSelection ?? defaultSelectedIds;
  const visibleScenarios = useMemo(
    () => scenarios.filter((s) => selectedIds.has(s.id)),
    [scenarios, selectedIds],
  );

  const activeBucketLabel = activeBucket
    ? folders.find((f) => f.id === activeBucket)?.name ?? 'Folder'
    : 'Unfiled';
  const isCustom = customSelection !== null;

  const handleStats = useCallback((scenarioId: string, stats: CompareRowStats) => {
    setStatsById((prev) => {
      const existing = prev[scenarioId];
      if (
        existing &&
        existing.placements === stats.placements &&
        existing.revenue === stats.revenue &&
        existing.cost === stats.cost &&
        existing.profit === stats.profit &&
        existing.ev === stats.ev &&
        existing.revenue6mo === stats.revenue6mo &&
        existing.revenue12mo === stats.revenue12mo &&
        existing.members === stats.members
      ) {
        return prev;
      }
      return { ...prev, [scenarioId]: stats };
    });
  }, []);

  const toggleSort = (key: CompareSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedScenarios = useMemo(() => {
    const arr = [...visibleScenarios];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      const sa = statsById[a.id];
      const sb = statsById[b.id];
      const va = sa ? sa[sortKey] : Number.NEGATIVE_INFINITY;
      const vb = sb ? sb[sortKey] : Number.NEGATIVE_INFINITY;
      if (va === vb) return 0;
      return (va < vb ? -1 : 1) * dir;
    });
    return arr;
  }, [visibleScenarios, statsById, sortKey, sortDir]);

  return (
    <section>
      <div className="flex items-center justify-between mb-2 gap-2">
        <h3 className="text-xs uppercase tracking-wide text-gray-400 flex items-center gap-1">
          <GitCompare className="w-3 h-3" /> Compare scenarios
          <span className="ml-2 normal-case tracking-normal text-gray-500 dark:text-gray-400">
            {isCustom ? (
              <>· {visibleScenarios.length} selected</>
            ) : (
              <>· {activeBucketLabel} ({visibleScenarios.length})</>
            )}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {isCustom && (
            <button
              onClick={() => setCustomSelection(null)}
              className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
              title="Reset to scenarios in the active folder"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className={clsx(
              'text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border',
              pickerOpen
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800',
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
            Customize
          </button>
        </div>
      </div>

      {pickerOpen && (
        <ScenarioComparePicker
          scenarios={scenarios}
          folders={folders}
          selectedIds={selectedIds}
          activeScenarioId={activeScenarioId}
          onChange={(next) => setCustomSelection(next)}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
            <tr>
              <SortableTh sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort}>Scenario</SortableTh>
              <SortableTh sortKey="placements" current={sortKey} dir={sortDir} onSort={toggleSort}>Placements</SortableTh>
              <SortableTh sortKey="members" current={sortKey} dir={sortDir} onSort={toggleSort}>Members</SortableTh>
              <SortableTh sortKey="revenue6mo" current={sortKey} dir={sortDir} onSort={toggleSort}>6mo rev</SortableTh>
              <SortableTh sortKey="revenue12mo" current={sortKey} dir={sortDir} onSort={toggleSort}>12mo rev</SortableTh>
              <SortableTh sortKey="revenue" current={sortKey} dir={sortDir} onSort={toggleSort}>Lifetime rev</SortableTh>
              <SortableTh sortKey="cost" current={sortKey} dir={sortDir} onSort={toggleSort}>Cost</SortableTh>
              <SortableTh sortKey="profit" current={sortKey} dir={sortDir} onSort={toggleSort}>Profit</SortableTh>
              <SortableTh sortKey="ev" current={sortKey} dir={sortDir} onSort={toggleSort}>EV</SortableTh>
            </tr>
          </thead>
          <tbody>
            {sortedScenarios.map((s) => (
              <ScenarioCompareTableRow
                key={s.id}
                scenarioId={s.id}
                name={s.name}
                isActive={s.id === activeScenarioId}
                onStats={handleStats}
              />
            ))}
            {sortedScenarios.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-gray-400 italic py-4">
                  No scenarios selected — use Customize to pick scenarios to compare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScenarioComparePicker({
  scenarios,
  folders,
  selectedIds,
  activeScenarioId,
  onChange,
  onClose,
}: {
  scenarios: { id: string; name: string; folderId?: string }[];
  folders: { id: string; name: string }[];
  selectedIds: Set<string>;
  activeScenarioId: string | null;
  onChange: (next: Set<string>) => void;
  onClose: () => void;
}) {
  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const groups: Array<{ key: string; label: string; items: typeof scenarios }> = [];
  for (const f of folders) {
    const items = scenarios.filter((s) => s.folderId === f.id);
    if (items.length > 0) groups.push({ key: f.id, label: f.name, items });
  }
  const unfiled = scenarios.filter((s) => !s.folderId);
  if (unfiled.length > 0) groups.push({ key: 'unfiled', label: 'Unfiled', items: unfiled });

  const selectGroup = (items: typeof scenarios, mode: 'add' | 'remove') => {
    const next = new Set(selectedIds);
    for (const s of items) {
      if (mode === 'add') next.add(s.id);
      else next.delete(s.id);
    }
    onChange(next);
  };

  return (
    <div className="mb-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide text-gray-500">
          Pick scenarios to compare
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(new Set(scenarios.map((s) => s.id)))}
            className="text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
          >
            Select all
          </button>
          <button
            onClick={() =>
              onChange(activeScenarioId ? new Set([activeScenarioId]) : new Set())
            }
            className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Close picker"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        {groups.map((g) => {
          const allSelected = g.items.every((s) => selectedIds.has(s.id));
          return (
            <div key={g.key}>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Folder className="w-3 h-3 text-indigo-400" />
                  {g.label}
                </span>
                <button
                  onClick={() => selectGroup(g.items, allSelected ? 'remove' : 'add')}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
                >
                  {allSelected ? 'Clear' : 'All'}
                </button>
              </div>
              <div className="space-y-0.5">
                {g.items.map((s) => {
                  const checked = selectedIds.has(s.id);
                  const isActive = s.id === activeScenarioId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={clsx(
                        'w-full text-left text-xs px-2 py-1 rounded flex items-center gap-2',
                        checked
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300',
                      )}
                    >
                      <span
                        className={clsx(
                          'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0',
                          checked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-gray-300 dark:border-gray-600',
                        )}
                      >
                        {checked && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span className="flex-1 truncate">{s.name}</span>
                      {isActive && (
                        <span className="text-[9px] uppercase tracking-wide text-indigo-500">
                          active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SortableTh({
  children,
  sortKey,
  current,
  dir,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: CompareSortKey;
  current: CompareSortKey;
  dir: 'asc' | 'desc';
  onSort: (key: CompareSortKey) => void;
}) {
  const isActive = current === sortKey;
  return (
    <th className="text-left px-3 py-2 font-medium select-none">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={clsx(
          'inline-flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200',
          isActive ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500',
        )}
      >
        {children}
        {isActive ? (
          dir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}

function ScenarioCompareTableRow({
  scenarioId,
  name,
  isActive,
  onStats,
}: {
  scenarioId: string;
  name: string;
  isActive: boolean;
  onStats: (scenarioId: string, stats: CompareRowStats) => void;
}) {
  const { data: placements = [] } = usePlacements(scenarioId);
  const stats = useMemo(() => computeScenarioCompareStats(placements), [placements]);
  const rowStats = useMemo<CompareRowStats>(
    () => ({ ...stats, placements: placements.length }),
    [stats, placements.length],
  );
  useEffect(() => {
    onStats(scenarioId, rowStats);
  }, [scenarioId, rowStats, onStats]);
  return (
    <tr
      className={clsx(
        'border-t border-gray-100 dark:border-gray-800',
        isActive && 'bg-indigo-50/50 dark:bg-indigo-900/20',
      )}
    >
      <Td className={clsx('font-medium', isActive && 'text-indigo-700 dark:text-indigo-200')}>
        {name}
        {isActive && <span className="ml-2 text-[9px] uppercase tracking-wide text-indigo-500">active</span>}
      </Td>
      <Td>{placements.length}</Td>
      <Td title="Avg active paying members across the next 12 months (memberships) + one-off registrations">
        {Math.round(stats.members)}
      </Td>
      <Td>{fmt(stats.revenue6mo)}</Td>
      <Td>{fmt(stats.revenue12mo)}</Td>
      <Td>{fmt(stats.revenue)}</Td>
      <Td>{fmt(stats.cost)}</Td>
      <Td className={clsx(stats.profit >= 0 ? 'text-emerald-600' : 'text-rose-600', 'font-semibold')}>{fmt(stats.profit)}</Td>
      <Td className={clsx(stats.ev >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{fmt(stats.ev)}</Td>
    </tr>
  );
}

// Aggregates a scenario's placements into the headline metrics shown in the
// compare table. For memberships, revenue is projected period-by-period using
// the placement's churn rate (NOT capped at retentionMonths), so lifetime
// reflects the true churn-driven sum and the 6/12-month windows only count
// periods that land inside those calendar windows from today. One-off revenue
// lands entirely in its delivery-start month.
function computeScenarioCompareStats(placements: CoursePlacement[]) {
  const now = new Date();
  const sixMonthsOut = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const twelveMonthsOut = new Date(now.getFullYear(), now.getMonth() + 12, 1);

  let revenue = 0;
  let cost = 0;
  let profit = 0;
  let ev = 0;
  let revenue6mo = 0;
  let revenue12mo = 0;
  let members = 0;

  for (const p of placements) {
    const m = computePlacementMetrics(p);
    cost += m.cost;
    ev += m.expectedValue;

    if (p.isMembership) {
      const projected = projectChurnStream(p, 120);
      let lifetimeRev = 0;
      let activeSum = 0;
      let activeCount = 0;
      for (const row of projected) {
        lifetimeRev += row.revenue;
        if (row.date >= now && row.date < twelveMonthsOut) {
          revenue12mo += row.revenue;
          activeSum += row.active;
          activeCount += 1;
          if (row.date < sixMonthsOut) revenue6mo += row.revenue;
        }
      }
      revenue += lifetimeRev;
      profit += lifetimeRev - m.cost;
      members += activeCount > 0 ? activeSum / activeCount : 0;
    } else {
      const rev = computeRevenue(p);
      revenue += rev;
      profit += m.profit;
      if (m.deliveryStart >= now && m.deliveryStart < twelveMonthsOut) {
        revenue12mo += rev;
        if (m.deliveryStart < sixMonthsOut) revenue6mo += rev;
      }
      members += p.projectedRegistrations;
    }
  }
  return { revenue, cost, profit, ev, revenue6mo, revenue12mo, members };
}

// Membership projection driven purely by churn (independent of retentionMonths).
// Walks period-by-period from delivery start, applying churn each period, and
// stops once the active cohort effectively dies out or the horizon is reached.
function projectChurnStream(p: CoursePlacement, maxPeriods: number) {
  const cohort = effectiveCohort(p);
  const price = effectivePrice(p);
  const r = Math.min(1, Math.max(0, effectiveChurn(p) / 100));
  const periodDays = p.courseTemplate?.billingPeriodDays ?? 30;
  const conv = p.trialToPaidConversionPercent / 100;
  const trialPeriods =
    p.entryMode === 'trial-to-paid' ? Math.ceil(p.trialDurationDays / periodDays) : 0;
  const out: { date: Date; active: number; revenue: number }[] = [];
  let active = 0;
  for (let k = 0; k < maxPeriods; k++) {
    const date = new Date(p.deliveryStartDate);
    date.setDate(date.getDate() + k * periodDays);
    if (p.entryMode === 'trial-to-paid') {
      if (k === trialPeriods) active = cohort * conv;
      else if (k > trialPeriods) active = Math.max(0, active - active * r);
    } else {
      if (k === 0) active = cohort;
      else active = Math.max(0, active - active * r);
    }
    const revenue = active * price;
    out.push({ date, active, revenue });
    if (k > 24 && active < 0.5) break;
    if (r >= 1 && k > trialPeriods) break;
  }
  return out;
}

function RiskPill({ level }: { level: ReturnType<typeof riskLevel> }) {
  const tones: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-rose-100 text-rose-700',
  };
  return <span className={clsx('text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide', tones[level])}>{level}</span>;
}
