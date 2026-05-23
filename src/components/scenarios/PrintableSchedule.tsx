'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Printer, X } from 'lucide-react';
import { usePlacements } from '@/hooks/useScenariosQuery';
import {
  computePlacementMetrics,
  computeRevenue,
  effectiveCohort,
  CoursePlacement,
} from '@/types/scenarios';

interface PrintableScheduleProps {
  open: boolean;
  onClose: () => void;
  scenarioId: string | null;
  scenarioName: string;
}

interface Row {
  id: string;
  course: string;
  marketingStart: Date;
  marketingEnd: Date; // inclusive last day of marketing
  marketingDays: number;
  deliveryStart: Date;
  deliveryEnd: Date;
  deliveryDays: number;
  registrations: number;
  revenue: number;
  cost: number;
  profit: number;
  isMembership: boolean;
}

function buildRows(placements: CoursePlacement[]): Row[] {
  return placements
    .map((p) => {
      const m = computePlacementMetrics(p);
      const marketingEndInclusive = new Date(m.marketingEnd);
      marketingEndInclusive.setDate(marketingEndInclusive.getDate() - 1);
      return {
        id: p.id,
        course: p.courseTemplate?.name ?? 'Untitled course',
        marketingStart: m.marketingStart,
        marketingEnd: marketingEndInclusive,
        marketingDays: p.marketingDurationDays,
        deliveryStart: m.deliveryStart,
        deliveryEnd: m.deliveryEnd,
        deliveryDays: p.deliveryDurationDays,
        registrations: Math.round(effectiveCohort(p)),
        revenue: computeRevenue(p),
        cost: m.cost,
        profit: m.profit,
        isMembership: p.isMembership,
      };
    })
    .sort((a, b) => a.marketingStart.getTime() - b.marketingStart.getTime());
}

function money(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function dateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`;
  }
  if (sameYear) {
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`;
  }
  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
}

export function PrintableSchedule({ open, onClose, scenarioId, scenarioName }: PrintableScheduleProps) {
  const { data: placements = [] } = usePlacements(scenarioId ?? undefined);
  const rows = useMemo(() => buildRows(placements), [placements]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.registrations += r.registrations;
          acc.revenue += r.revenue;
          acc.cost += r.cost;
          acc.profit += r.profit;
          return acc;
        },
        { registrations: 0, revenue: 0, cost: 0, profit: 0 },
      ),
    [rows],
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const today = new Date();

  return createPortal(
    <>
      {/* Print-only styles: hide everything except the printable sheet. */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 14mm; }
          body > *:not(.printable-schedule-root) { display: none !important; }
          .printable-schedule-root { position: static !important; background: white !important; }
          .printable-schedule-backdrop { display: none !important; }
          .printable-schedule-toolbar { display: none !important; }
          .printable-schedule-sheet {
            position: static !important;
            box-shadow: none !important;
            border: none !important;
            max-height: none !important;
            width: 100% !important;
            max-width: none !important;
            overflow: visible !important;
          }
          .printable-schedule-scroll { overflow: visible !important; max-height: none !important; }
          .printable-schedule-table { font-size: 11pt; }
          .printable-schedule-table th { background: #f3f4f6 !important; color: #111827 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .printable-schedule-table tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="printable-schedule-root fixed inset-0 z-[70] flex items-center justify-center">
        <div
          className="printable-schedule-backdrop absolute inset-0 bg-black/40"
          onClick={onClose}
          aria-hidden
        />
        <div className="printable-schedule-sheet relative bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 w-[min(1100px,96vw)] max-h-[92vh] flex flex-col">
          <header className="printable-schedule-toolbar px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-500" />
                Printable schedule · {scenarioName}
              </h2>
              <p className="text-[11px] text-gray-500">
                Use your browser's print dialog and choose "Save as PDF" as the destination.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save as PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          <div className="printable-schedule-scroll flex-1 overflow-y-auto p-6">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold">{scenarioName}</h1>
                <p className="text-xs text-gray-500">Course schedule · {rows.length} course{rows.length === 1 ? '' : 's'}</p>
              </div>
              <p className="text-xs text-gray-500">Generated {format(today, 'd MMM yyyy')}</p>
            </div>

            <table className="printable-schedule-table w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="text-left font-semibold px-2 py-2 border border-gray-300">Course</th>
                  <th className="text-left font-semibold px-2 py-2 border border-gray-300">Marketing</th>
                  <th className="text-right font-semibold px-2 py-2 border border-gray-300">Mkt days</th>
                  <th className="text-left font-semibold px-2 py-2 border border-gray-300">Delivery</th>
                  <th className="text-right font-semibold px-2 py-2 border border-gray-300">Del. days</th>
                  <th className="text-right font-semibold px-2 py-2 border border-gray-300">Expected regs</th>
                  <th className="text-right font-semibold px-2 py-2 border border-gray-300">Expected revenue</th>
                  <th className="text-right font-semibold px-2 py-2 border border-gray-300">Cost</th>
                  <th className="text-right font-semibold px-2 py-2 border border-gray-300">Profit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-2 py-2 border border-gray-300 font-medium">
                      {r.course}
                      {r.isMembership && (
                        <span className="ml-1 text-[9px] uppercase text-amber-700">· membership</span>
                      )}
                    </td>
                    <td className="px-2 py-2 border border-gray-300">{dateRange(r.marketingStart, r.marketingEnd)}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{r.marketingDays}</td>
                    <td className="px-2 py-2 border border-gray-300">{dateRange(r.deliveryStart, r.deliveryEnd)}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{r.deliveryDays}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{r.registrations}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{money(r.revenue)}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{money(r.cost)}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right font-semibold">{money(r.profit)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-6 border border-gray-300 text-center text-gray-400 italic">
                      No courses scheduled in this scenario.
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-2 py-2 border border-gray-300" colSpan={5}>
                      Totals
                    </td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{totals.registrations}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{money(totals.revenue)}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{money(totals.cost)}</td>
                    <td className="px-2 py-2 border border-gray-300 text-right">{money(totals.profit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
