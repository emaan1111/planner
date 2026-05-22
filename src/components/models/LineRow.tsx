'use client';

import { useState } from 'react';
import {
  useUpdateLine,
  useDeleteLine,
} from '@/hooks/useModelsQuery';
import { useScenarios } from '@/hooks/useScenariosQuery';
import { ModelLine, InputMode, LineKind, LinkedField, DriverBase } from '@/types/models';
import { Trash2, ChevronDown, ChevronRight, Edit3 } from 'lucide-react';
import clsx from 'clsx';

interface LineRowProps {
  line: ModelLine;
  horizonMonths: number;
  pushUndo: (entry: { label: string; undo: () => Promise<void> | void }) => void;
}

const MODE_LABEL: Record<InputMode, string> = {
  flat: 'Flat $/mo',
  growth: 'Growth %',
  manual: 'Per-month',
  'linked-scenario': 'Linked scenario',
  driver: 'Driver %',
};

export function LineRow({ line, horizonMonths, pushUndo }: LineRowProps) {
  const updateLine = useUpdateLine();
  const deleteLine = useDeleteLine();
  const { data: scenarios = [] } = useScenarios();

  const [expanded, setExpanded] = useState(false);

  const update = (updates: Partial<ModelLine>) => {
    updateLine.mutate({ id: line.id, updates });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="p-0.5 text-gray-400 hover:text-gray-700"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <input
          value={line.name}
          onChange={(e) => update({ name: e.target.value })}
          className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-300 bg-transparent"
        />
        <select
          value={line.kind}
          onChange={(e) => update({ kind: e.target.value as LineKind })}
          className={clsx(
            'text-xs px-2 py-1 rounded border',
            line.kind === 'revenue'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700',
          )}
        >
          <option value="revenue">Revenue</option>
          <option value="cost">Cost</option>
        </select>
        <select
          value={line.inputMode}
          onChange={(e) => update({ inputMode: e.target.value as InputMode })}
          className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          {(Object.keys(MODE_LABEL) as InputMode[]).map((m) => (
            <option key={m} value={m}>
              {MODE_LABEL[m]}
            </option>
          ))}
        </select>
        <input
          value={line.category ?? ''}
          onChange={(e) => update({ category: e.target.value })}
          placeholder="category"
          className="w-24 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        />
        <button
          onClick={() => {
            const snapshot = { ...line };
            pushUndo({
              label: `Remove ${line.name}`,
              undo: async () => {
                // Re-creates via line-create endpoint
                const res = await fetch('/api/model-lines', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...snapshot,
                    startMonth: undefined,
                    endMonth: undefined,
                    createdAt: undefined,
                    updatedAt: undefined,
                    id: undefined,
                  }),
                });
                if (!res.ok) throw new Error('Undo failed');
              },
            });
            deleteLine.mutate(line.id);
          }}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
          title="Remove (cmd+Z to undo)"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>

      {/* Mode-specific inputs */}
      <div className="px-2 pb-2">
        <div className="grid grid-cols-4 gap-2 mt-1">
          {line.inputMode === 'flat' && (
            <NumberField
              label="Amount per month"
              value={line.flatAmount ?? 0}
              onChange={(v) => update({ flatAmount: v })}
              prefix="$"
            />
          )}
          {line.inputMode === 'growth' && (
            <>
              <NumberField
                label="Start amount"
                value={line.startAmount ?? 0}
                onChange={(v) => update({ startAmount: v })}
                prefix="$"
              />
              <NumberField
                label="Monthly growth"
                value={line.monthlyGrowthPercent ?? 0}
                onChange={(v) => update({ monthlyGrowthPercent: v })}
                suffix="%"
              />
            </>
          )}
          {line.inputMode === 'linked-scenario' && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400">Scenario</label>
                <select
                  value={line.linkedScenarioId ?? ''}
                  onChange={(e) => update({ linkedScenarioId: e.target.value })}
                  className="w-full text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <option value="">— pick scenario —</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400">Field</label>
                <select
                  value={line.linkedField ?? 'revenue'}
                  onChange={(e) => update({ linkedField: e.target.value as LinkedField })}
                  className="w-full text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <option value="revenue">Revenue</option>
                  <option value="cost">Cost</option>
                  <option value="profit">Profit</option>
                </select>
              </div>
            </>
          )}
          {line.inputMode === 'driver' && (
            <>
              <NumberField
                label="Percent"
                value={line.driverPercent ?? 0}
                onChange={(v) => update({ driverPercent: v })}
                suffix="%"
              />
              <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400">Base</label>
                <select
                  value={line.driverBase ?? 'revenue'}
                  onChange={(e) => update({ driverBase: e.target.value as DriverBase })}
                  className="w-full text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <option value="revenue">Total revenue</option>
                  <option value="cost">Total cost</option>
                  <option value="memberCount">Active members</option>
                </select>
              </div>
            </>
          )}
          {line.inputMode === 'manual' && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 col-span-4"
            >
              <Edit3 className="w-3 h-3" /> Expand to edit per-month values
            </button>
          )}
        </div>

        {expanded && line.inputMode === 'manual' && (
          <ManualValuesEditor
            values={line.manualValues ?? []}
            horizonMonths={horizonMonths}
            onChange={(arr) => update({ manualValues: arr })}
          />
        )}

        {expanded && (
          <div className="mt-2">
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Notes</label>
            <input
              value={line.notes ?? ''}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="assumption / source"
              className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-gray-400">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-gray-500">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        />
        {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

function ManualValuesEditor({
  values,
  horizonMonths,
  onChange,
}: {
  values: number[];
  horizonMonths: number;
  onChange: (arr: number[]) => void;
}) {
  // Ensure array is the right length
  const padded = Array.from({ length: horizonMonths }, (_, i) => values[i] ?? 0);
  return (
    <div className="mt-2 overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-min gap-1">
        {padded.map((v, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-[9px] text-gray-400">M{i + 1}</span>
            <input
              type="number"
              value={v}
              onChange={(e) => {
                const next = [...padded];
                next[i] = Number(e.target.value);
                onChange(next);
              }}
              className="w-16 text-xs text-right px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
