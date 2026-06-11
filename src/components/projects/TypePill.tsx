'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Plus, Layers, X } from 'lucide-react';
import { AnchoredMenu } from './AnchoredMenu';
import { categoryColor } from './CategoryPill';

interface TypePillProps {
  value?: string;
  /** Suggested types (plan types + types already in use), surfaced in the menu. */
  options: string[];
  onChange: (type: string | undefined) => void;
}

// Editable pill for a task's "type" (linkedPlanType). Mirrors CategoryPill but
// is fed by the configured plan types so the board can show a Type column.
export function TypePill({ value, options, onChange }: TypePillProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const addNew = () => {
    const v = draft.trim();
    if (!v) return;
    onChange(v);
    setDraft('');
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <button
        ref={anchorRef}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={clsx(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium max-w-full transition-transform hover:scale-[1.02]',
          value ? categoryColor(value) : 'text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600'
        )}
      >
        {value ? <span className="truncate">{value}</span> : <><Layers className="w-3 h-3" /> Set</>}
      </button>

      <AnchoredMenu anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} width={200}>
        <div className="max-h-44 overflow-y-auto">
          {options.map((c) => (
            <button
              key={c}
              onClick={(e) => { e.stopPropagation(); onChange(c); setOpen(false); }}
              className="w-full flex items-center px-1.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
            >
              <span className={clsx('px-2 py-0.5 rounded-md text-[11px] font-medium', categoryColor(c))}>{c}</span>
            </button>
          ))}
          {value && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(undefined); setOpen(false); }}
              className="w-full flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-[11px] text-gray-500"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1 pt-1 border-t border-gray-100 dark:border-gray-800">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); addNew(); } }}
            placeholder="New type…"
            autoFocus
            className="flex-1 min-w-0 px-1.5 py-1 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          />
          <button onClick={(e) => { e.stopPropagation(); addNew(); }} disabled={!draft.trim()} className="p-1 rounded-md bg-indigo-500 text-white disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </AnchoredMenu>
    </div>
  );
}
