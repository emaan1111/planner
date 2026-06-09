'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { STATUS_META, STATUS_ORDER, PRIORITY_META, PRIORITY_ORDER } from '@/lib/pm';
import { AnchoredMenu } from './AnchoredMenu';

interface DropdownProps {
  className?: string;
}

export function StatusPill({
  status,
  onChange,
  className,
  fullWidth,
}: DropdownProps & { status: TaskStatus; onChange: (next: TaskStatus) => void; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const meta = STATUS_META[status];

  return (
    <div className={clsx('relative', fullWidth ? 'w-full' : 'inline-block')}>
      <button
        ref={anchorRef}
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
      <AnchoredMenu anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} width={160}>
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
      </AnchoredMenu>
    </div>
  );
}

export function PriorityPill({
  priority,
  onChange,
  className,
}: DropdownProps & { priority: TaskPriority; onChange: (next: TaskPriority) => void }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const meta = PRIORITY_META[priority];

  return (
    <div className="relative inline-block">
      <button
        ref={anchorRef}
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
      <AnchoredMenu anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} width={150}>
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
      </AnchoredMenu>
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
