'use client';

import { useUpdateHeadcount, useDeleteHeadcount, useCreateHeadcount } from '@/hooks/useModelsQuery';
import { ModelHeadcount } from '@/types/models';
import { Trash2, User } from 'lucide-react';

interface HeadcountRowProps {
  hc: ModelHeadcount;
  pushUndo: (entry: { label: string; undo: () => Promise<void> | void }) => void;
}

export function HeadcountRow({ hc, pushUndo }: HeadcountRowProps) {
  const update = useUpdateHeadcount();
  const del = useDeleteHeadcount();
  const create = useCreateHeadcount();

  const set = (updates: Partial<ModelHeadcount>) => update.mutate({ id: hc.id, updates });

  return (
    <div className="px-2 py-2 border border-gray-200 dark:border-gray-800 rounded">
      {/* Top row: identity + remove */}
      <div className="flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input
          value={hc.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Name"
          className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-300 bg-transparent"
        />
        <input
          value={hc.role ?? ''}
          onChange={(e) => set({ role: e.target.value })}
          placeholder="Role"
          className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-300 bg-transparent"
        />
        <button
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            (document.activeElement as HTMLElement | null)?.blur?.();
            const snapshot = { ...hc };
            pushUndo({
              label: `Remove ${snapshot.name}`,
              undo: async () => {
                await create.mutateAsync({
                  modelId: snapshot.modelId,
                  name: snapshot.name,
                  role: snapshot.role,
                  annualSalary: snapshot.annualSalary,
                  startMonth: new Date(snapshot.startMonth),
                  endMonth: snapshot.endMonth ? new Date(snapshot.endMonth) : undefined,
                  benefitsPercent: snapshot.benefitsPercent,
                  notes: snapshot.notes,
                  order: snapshot.order,
                });
              },
            });
            del.mutate(hc.id);
          }}
          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0"
          title="Remove (cmd+Z to undo)"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>

      {/* Compensation row: 1 col on phone, 3 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-400">Annual salary</label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">$</span>
            <input
              type="number"
              inputMode="numeric"
              value={hc.annualSalary}
              onChange={(e) => set({ annualSalary: Number(e.target.value) })}
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              placeholder="annual"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-400">Start date</label>
          <input
            type="date"
            value={toIsoDate(hc.startMonth)}
            onChange={(e) => set({ startMonth: new Date(e.target.value) })}
            className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-400">Benefits</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={hc.benefitsPercent}
              onChange={(e) => set({ benefitsPercent: Number(e.target.value) })}
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              placeholder="benefits"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function toIsoDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
