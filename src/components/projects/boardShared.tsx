'use client';

import clsx from 'clsx';
import { Task } from '@/types';
import { BOARD_GRID, STATUS_META, statusCounts } from '@/lib/pm';

// Column header row that aligns with the task-row grid (monday Main Table).
export function ColumnHeaderRow() {
  return (
    <div
      className="grid items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
      style={{ gridTemplateColumns: BOARD_GRID }}
    >
      <span />
      <span />
      <span>Task</span>
      <span className="text-center">Status</span>
      <span className="text-center">Priority</span>
      <span className="text-center">Due</span>
      <span />
    </div>
  );
}

// monday-style "battery": a single bar split into colored segments by status share.
export function StatusSummaryBar({ tasks }: { tasks: Task[] }) {
  const counts = statusCounts(tasks);
  const total = tasks.length;
  if (total === 0) return null;
  return (
    <div className="flex h-5 w-full overflow-hidden rounded-md" title={counts.map((c) => `${STATUS_META[c.status].label}: ${c.count}`).join('  ·  ')}>
      {counts.map((c) => {
        const pct = (c.count / total) * 100;
        return (
          <div
            key={c.status}
            className={clsx('h-full flex items-center justify-center text-[9px] font-bold text-white/90', STATUS_META[c.status].dot)}
            style={{ width: `${pct}%` }}
          >
            {pct > 9 ? `${Math.round(pct)}%` : ''}
          </div>
        );
      })}
    </div>
  );
}
