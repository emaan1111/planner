'use client';

import { useUpdateHeadcount, useDeleteHeadcount } from '@/hooks/useModelsQuery';
import { ModelHeadcount } from '@/types/models';
import { Trash2, User } from 'lucide-react';

interface HeadcountRowProps {
  hc: ModelHeadcount;
  pushUndo: (entry: { label: string; undo: () => Promise<void> | void }) => void;
}

export function HeadcountRow({ hc, pushUndo }: HeadcountRowProps) {
  const update = useUpdateHeadcount();
  const del = useDeleteHeadcount();

  const set = (updates: Partial<ModelHeadcount>) => update.mutate({ id: hc.id, updates });

  return (
    <div className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 border border-gray-200 dark:border-gray-800 rounded">
      <User className="w-3.5 h-3.5 text-gray-400 col-span-1" />
      <input
        value={hc.name}
        onChange={(e) => set({ name: e.target.value })}
        placeholder="Name"
        className="col-span-2 px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-300 bg-transparent"
      />
      <input
        value={hc.role ?? ''}
        onChange={(e) => set({ role: e.target.value })}
        placeholder="Role"
        className="col-span-2 px-2 py-1 text-sm rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-300 bg-transparent"
      />
      <div className="col-span-2 flex items-center gap-1">
        <span className="text-xs text-gray-500">$</span>
        <input
          type="number"
          value={hc.annualSalary}
          onChange={(e) => set({ annualSalary: Number(e.target.value) })}
          className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          placeholder="annual"
        />
      </div>
      <input
        type="date"
        value={toIsoDate(hc.startMonth)}
        onChange={(e) => set({ startMonth: new Date(e.target.value) })}
        className="col-span-2 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      />
      <div className="col-span-2 flex items-center gap-1">
        <input
          type="number"
          value={hc.benefitsPercent}
          onChange={(e) => set({ benefitsPercent: Number(e.target.value) })}
          className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          placeholder="benefits"
        />
        <span className="text-xs text-gray-500">%</span>
      </div>
      <button
        onClick={() => {
          const snapshot = { ...hc };
          pushUndo({
            label: `Remove ${snapshot.name}`,
            undo: async () => {
              await fetch('/api/model-headcount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  modelId: snapshot.modelId,
                  name: snapshot.name,
                  role: snapshot.role,
                  annualSalary: snapshot.annualSalary,
                  startMonth: new Date(snapshot.startMonth).toISOString(),
                  endMonth: snapshot.endMonth ? new Date(snapshot.endMonth).toISOString() : null,
                  benefitsPercent: snapshot.benefitsPercent,
                  notes: snapshot.notes,
                  order: snapshot.order,
                }),
              });
            },
          });
          del.mutate(hc.id);
        }}
        className="col-span-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 justify-self-end"
        title="Remove (cmd+Z to undo)"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-500" />
      </button>
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
