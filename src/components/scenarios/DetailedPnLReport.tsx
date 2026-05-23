'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenariosStore } from '@/store/scenariosStore';
import { usePlacements, useScenarios } from '@/hooks/useScenariosQuery';
import {
  computePlacementMetrics,
  computeRevenue,
  membershipRevenueStream,
  riskLevel,
  likelihoodLevel,
  CoursePlacement,
} from '@/types/scenarios';
import { X, TrendingUp, AlertTriangle, Users, GitCompare } from 'lucide-react';
import clsx from 'clsx';

interface DetailedPnLReportProps {
  open: boolean;
  onClose: () => void;
}

export function DetailedPnLReport({ open, onClose }: DetailedPnLReportProps) {
  const { activeScenarioId } = useScenariosStore();
  const { data: scenarios = [] } = useScenarios();
  const scenario = scenarios.find((s) => s.id === activeScenarioId);
  const { data: placements = [] } = usePlacements(activeScenarioId ?? undefined);

  const report = useMemo(() => buildReport(placements), [placements]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-[1100px] max-w-[96vw] max-h-[92vh] overflow-hidden flex flex-col"
        >
          <header className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Detailed P&L · {scenario?.name ?? 'Scenario'}
              </h2>
              <p className="text-xs text-gray-500">
                {placements.length} placement{placements.length === 1 ? '' : 's'} · 12-month projection
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

            {/* Scenario comparison — full table of all scenarios */}
            {scenarios.length > 1 && (
              <section>
                <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
                  <GitCompare className="w-3 h-3" /> Compare scenarios
                </h3>
                <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                      <tr>
                        <Th>Scenario</Th>
                        <Th>Placements</Th>
                        <Th>Revenue</Th>
                        <Th>Cost</Th>
                        <Th>Profit</Th>
                        <Th>EV</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((s) => (
                        <ScenarioCompareTableRow
                          key={s.id}
                          scenarioId={s.id}
                          name={s.name}
                          isActive={s.id === activeScenarioId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
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
                            {m.entryMode === 'trial-to-paid' ? 'Trial → Paid' : 'Direct entry'} · {m.churn}% churn · ${m.price}/period
                          </span>
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
    </AnimatePresence>
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
        churn: p.monthlyChurnPercent,
        price: p.pricePerChild,
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
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx('px-3 py-2', className)}>{children}</td>;
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

function ScenarioCompareTableRow({
  scenarioId,
  name,
  isActive,
}: {
  scenarioId: string;
  name: string;
  isActive: boolean;
}) {
  const { data: placements = [] } = usePlacements(scenarioId);
  let revenue = 0;
  let cost = 0;
  let profit = 0;
  let ev = 0;
  for (const p of placements) {
    const m = computePlacementMetrics(p);
    revenue += computeRevenue(p);
    cost += m.cost;
    profit += m.profit;
    ev += m.expectedValue;
  }
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
      <Td>{fmt(revenue)}</Td>
      <Td>{fmt(cost)}</Td>
      <Td className={clsx(profit >= 0 ? 'text-emerald-600' : 'text-rose-600', 'font-semibold')}>{fmt(profit)}</Td>
      <Td className={clsx(ev >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{fmt(ev)}</Td>
    </tr>
  );
}

function RiskPill({ level }: { level: ReturnType<typeof riskLevel> }) {
  const tones: Record<string, string> = {
    low: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-rose-100 text-rose-700',
  };
  return <span className={clsx('text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide', tones[level])}>{level}</span>;
}
