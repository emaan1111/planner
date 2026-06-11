'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Columns3, Check, ChevronDown } from 'lucide-react';
import { ADDABLE_COLUMNS } from '@/lib/pm';
import { AnchoredMenu } from './AnchoredMenu';

interface ColumnsMenuProps {
  enabled: Record<'type' | 'category', boolean>;
  onToggle: (key: 'type' | 'category') => void;
}

// Dropdown that lets the user add/remove optional list-view columns (Type, Category).
export function ColumnsMenu({ enabled, onToggle }: ColumnsMenuProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const activeCount = ADDABLE_COLUMNS.filter((c) => enabled[c.key]).length;

  return (
    <>
      <button
        ref={anchorRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Columns3 className="w-3.5 h-3.5" /> Columns
        {activeCount > 0 && <span className="text-[10px] text-indigo-500 font-semibold">+{activeCount}</span>}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      <AnchoredMenu anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} align="right" width={180}>
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Add columns</div>
        {ADDABLE_COLUMNS.map((c) => (
          <button
            key={c.key}
            onClick={(e) => { e.stopPropagation(); onToggle(c.key); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-left"
          >
            <span className={clsx(
              'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
              enabled[c.key] ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600'
            )}>
              {enabled[c.key] && <Check className="w-3 h-3" />}
            </span>
            {c.label}
          </button>
        ))}
      </AnchoredMenu>
    </>
  );
}
