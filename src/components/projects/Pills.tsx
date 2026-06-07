'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { STATUS_META, STATUS_ORDER, PRIORITY_META, PRIORITY_ORDER } from '@/lib/pm';

interface DropdownProps {
  className?: string;
}

// Small inline dropdown shared by the status + priority pills.
function PillMenu({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      {/* click-away backdrop */}
      <button className="fixed inset-0 z-30 cursor-default" onClick={onClose} aria-hidden tabIndex={-1} />
      <div className="absolute z-40 mt-1 left-0 min-w-[150px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1">
        {children}
      </div>
    </>
  );
}

export function StatusPill({
  status,
  onChange,
  className,
  fullWidth,
}: DropdownProps & { status: TaskStatus; onChange: (next: TaskStatus) => void; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[status];

  return (
    <div className={clsx('relative', fullWidth ? 'w-full' : 'inline-block')}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={clsx(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-transform hover:scale-[1.03] whitespace-nowrap',
          fullWidth && 'w-full justify-center',
          meta.pill,
          className
        )}
      >
        {meta.label}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>
      <PillMenu open={open} onClose={() => setOpen(false)}>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              onChange(s);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
          >
            <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', STATUS_META[s].dot)} />
            <span className="text-gray-700 dark:text-gray-200">{STATUS_META[s].label}</span>
          </button>
        ))}
      </PillMenu>
    </div>
  );
}

export function PriorityPill({
  priority,
  onChange,
  className,
}: DropdownProps & { priority: TaskPriority; onChange: (next: TaskPriority) => void }) {
  const [open, setOpen] = useState(false);
  const meta = PRIORITY_META[priority];

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={clsx(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-transform hover:scale-[1.03] whitespace-nowrap',
          meta.pill,
          className
        )}
      >
        {meta.label}
      </button>
      <PillMenu open={open} onClose={() => setOpen(false)}>
        {PRIORITY_ORDER.map((p) => (
          <button
            key={p}
            onClick={(e) => {
              e.stopPropagation();
              onChange(p);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
          >
            <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-medium', PRIORITY_META[p].pill)}>
              {PRIORITY_META[p].label}
            </span>
          </button>
        ))}
      </PillMenu>
    </div>
  );
}

// Read-only status dot + label (used in compact contexts like timeline tooltips).
export function StatusTag({ status }: { status: Task['status'] }) {
  const meta = STATUS_META[status];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold', meta.pill)}>
      {meta.label}
    </span>
  );
}
