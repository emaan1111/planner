'use client';

import { ComputedModel, ModelLine, ModelHeadcount } from '@/types/models';
import clsx from 'clsx';

interface ProjectionTableProps {
  computed: ComputedModel;
  lines: ModelLine[];
  headcount: ModelHeadcount[];
}

export function ProjectionTable({ computed, lines, headcount }: ProjectionTableProps) {
  const revenueLines = lines.filter((l) => l.kind === 'revenue');
  const costLines = lines.filter((l) => l.kind === 'cost');

  return (
    <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 sticky top-0">
          <tr>
            <Th className="text-left min-w-[180px] sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">Line</Th>
            {computed.monthLabels.map((m) => (
              <Th key={m} className="text-right whitespace-nowrap">{m}</Th>
            ))}
            <Th className="text-right whitespace-nowrap bg-gray-100 dark:bg-gray-700">Total</Th>
          </tr>
        </thead>
        <tbody>
          {/* Revenue lines */}
          {revenueLines.length > 0 && (
            <>
              <SectionRow label="Revenue" tone="emerald" colSpan={computed.monthLabels.length + 2} />
              {revenueLines.map((l) => {
                const arr = computed.byLine[l.id] ?? [];
                const total = arr.reduce((s, v) => s + v, 0);
                return (
                  <tr key={l.id} className="border-t border-gray-100 dark:border-gray-800">
                    <Td className="sticky left-0 bg-white dark:bg-gray-900 z-10">
                      {l.name}
                      <span className="ml-1 text-[9px] uppercase text-gray-400">{l.inputMode}</span>
                    </Td>
                    {arr.map((v, i) => (
                      <Td key={i} className="text-right text-emerald-600 dark:text-emerald-300">
                        {fmt(v)}
                      </Td>
                    ))}
                    <Td className="text-right font-semibold bg-gray-50 dark:bg-gray-800">{fmt(total)}</Td>
                  </tr>
                );
              })}
              <SubtotalRow label="Total revenue" values={computed.totalRevenue} tone="emerald" />
            </>
          )}

          {/* Cost lines */}
          {costLines.length > 0 && (
            <>
              <SectionRow label="Costs" tone="rose" colSpan={computed.monthLabels.length + 2} />
              {costLines.map((l) => {
                const arr = computed.byLine[l.id] ?? [];
                const total = arr.reduce((s, v) => s + v, 0);
                return (
                  <tr key={l.id} className="border-t border-gray-100 dark:border-gray-800">
                    <Td className="sticky left-0 bg-white dark:bg-gray-900 z-10">
                      {l.name}
                      <span className="ml-1 text-[9px] uppercase text-gray-400">{l.inputMode}</span>
                    </Td>
                    {arr.map((v, i) => (
                      <Td key={i} className="text-right text-rose-600 dark:text-rose-300">
                        {fmt(v)}
                      </Td>
                    ))}
                    <Td className="text-right font-semibold bg-gray-50 dark:bg-gray-800">{fmt(total)}</Td>
                  </tr>
                );
              })}
            </>
          )}

          {/* Payroll lines */}
          {headcount.length > 0 && (
            <>
              <SectionRow label="Payroll" tone="rose" colSpan={computed.monthLabels.length + 2} />
              {headcount.map((h) => {
                const arr = computed.payrollByPerson[h.id] ?? [];
                const total = arr.reduce((s, v) => s + v, 0);
                return (
                  <tr key={h.id} className="border-t border-gray-100 dark:border-gray-800">
                    <Td className="sticky left-0 bg-white dark:bg-gray-900 z-10">
                      {h.name} {h.role && <span className="text-gray-400">· {h.role}</span>}
                    </Td>
                    {arr.map((v, i) => (
                      <Td key={i} className="text-right text-rose-600 dark:text-rose-300">
                        {fmt(v)}
                      </Td>
                    ))}
                    <Td className="text-right font-semibold bg-gray-50 dark:bg-gray-800">{fmt(total)}</Td>
                  </tr>
                );
              })}
            </>
          )}

          {/* Tax line if any */}
          {computed.taxPerMonth.some((v) => v > 0) && (
            <tr className="border-t border-gray-100 dark:border-gray-800">
              <Td className="sticky left-0 bg-white dark:bg-gray-900 z-10 italic text-gray-500">Tax</Td>
              {computed.taxPerMonth.map((v, i) => (
                <Td key={i} className="text-right italic text-rose-500">
                  {fmt(v)}
                </Td>
              ))}
              <Td className="text-right font-semibold bg-gray-50 dark:bg-gray-800">
                {fmt(computed.taxPerMonth.reduce((s, v) => s + v, 0))}
              </Td>
            </tr>
          )}

          <SubtotalRow label="Total cost" values={computed.totalCost} tone="rose" />

          {/* Profit + cash */}
          <SectionRow label="Bottom line" tone="indigo" colSpan={computed.monthLabels.length + 2} />
          <SubtotalRow label="Profit" values={computed.profit} tone="profit" />
          <tr className="border-t border-gray-100 dark:border-gray-800 font-semibold">
            <Td className="sticky left-0 bg-white dark:bg-gray-900 z-10">Cumulative cash</Td>
            {computed.cumulativeCash.map((v, i) => (
              <Td key={i} className={clsx('text-right', v >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {fmt(v)}
              </Td>
            ))}
            <Td className="text-right bg-gray-50 dark:bg-gray-800">
              {fmt(computed.cumulativeCash[computed.cumulativeCash.length - 1] ?? 0)}
            </Td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SectionRow({ label, tone, colSpan }: { label: string; tone: 'emerald' | 'rose' | 'indigo'; colSpan: number }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50/60 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-200',
    rose: 'bg-rose-50/60 dark:bg-rose-900/10 text-rose-700 dark:text-rose-200',
    indigo: 'bg-indigo-50/60 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-200',
  };
  return (
    <tr className={clsx('text-[10px] uppercase tracking-wide font-semibold', tones[tone])}>
      <td colSpan={colSpan} className="px-3 py-1 sticky left-0">
        {label}
      </td>
    </tr>
  );
}

function SubtotalRow({ label, values, tone }: { label: string; values: number[]; tone: 'emerald' | 'rose' | 'profit' }) {
  const total = values.reduce((s, v) => s + v, 0);
  return (
    <tr className="border-t-2 border-gray-300 dark:border-gray-700 font-semibold bg-gray-50 dark:bg-gray-800">
      <Td className="sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">{label}</Td>
      {values.map((v, i) => (
        <Td
          key={i}
          className={clsx(
            'text-right',
            tone === 'profit' ? (v >= 0 ? 'text-emerald-600' : 'text-rose-600') :
            tone === 'emerald' ? 'text-emerald-700 dark:text-emerald-200' :
            'text-rose-700 dark:text-rose-200',
          )}
        >
          {fmt(v)}
        </Td>
      ))}
      <Td className="text-right bg-gray-100 dark:bg-gray-700">{fmt(total)}</Td>
    </tr>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx('px-3 py-2 font-medium', className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx('px-3 py-1.5 whitespace-nowrap', className)}>{children}</td>;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (Math.abs(n) < 1) return '·';
  return `$${n.toFixed(0)}`;
}
