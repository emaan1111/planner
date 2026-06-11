'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Plus, ChevronDown, X } from 'lucide-react';
import { TaskColumn } from '@/types';
import { AnchoredMenu } from './AnchoredMenu';
import { categoryColor } from './CategoryPill';

interface CustomCellProps {
  column: TaskColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  /** For select columns: persist a brand-new option onto the column definition. */
  onAddOption?: (option: string) => void;
}

// Inline editable cell for a user-defined column. Dispatches on column.type.
export function CustomCell({ column, value, onChange, onAddOption }: CustomCellProps) {
  switch (column.type) {
    case 'checkbox':
      return (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            aria-label={column.name}
          />
        </div>
      );
    case 'date':
      return (
        <div className="flex justify-center min-w-0">
          <input
            type="date"
            value={typeof value === 'string' ? value.slice(0, 10) : ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-[11px] text-gray-600 dark:text-gray-300 rounded-md px-1 py-0.5 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-400 focus:outline-none"
          />
        </div>
      );
    case 'select':
      return <SelectCell column={column} value={value} onChange={onChange} onAddOption={onAddOption} />;
    case 'number':
      return <TextCell value={value} onChange={onChange} numeric />;
    default:
      return <TextCell value={value} onChange={onChange} />;
  }
}

function TextCell({ value, onChange, numeric }: { value: unknown; onChange: (v: unknown) => void; numeric?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const start = () => { setDraft(value == null ? '' : String(value)); setEditing(true); };
  const commit = () => {
    setEditing(false);
    const t = draft.trim();
    if (t === '') { onChange(undefined); return; }
    onChange(numeric ? Number(t) : t);
  };

  if (editing) {
    return (
      <div className="flex justify-center min-w-0">
        <input
          autoFocus
          type={numeric ? 'number' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-full bg-white dark:bg-gray-900 text-[12px] text-gray-800 dark:text-gray-100 rounded-md px-1.5 py-0.5 border border-indigo-400 focus:outline-none"
        />
      </div>
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); start(); }}
      className={clsx(
        'w-full text-center text-[12px] rounded-md px-1.5 py-0.5 truncate border border-transparent hover:border-gray-200 dark:hover:border-gray-700',
        value == null || value === '' ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'
      )}
    >
      {value == null || value === '' ? '—' : String(value)}
    </button>
  );
}

function SelectCell({ column, value, onChange, onAddOption }: CustomCellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const current = typeof value === 'string' ? value : undefined;

  const addNew = () => {
    const v = draft.trim();
    if (!v) return;
    if (!column.options.includes(v)) onAddOption?.(v);
    onChange(v);
    setDraft('');
    setOpen(false);
  };

  return (
    <div className="relative w-full flex justify-center">
      <button
        ref={anchorRef}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={clsx(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium max-w-full transition-transform hover:scale-[1.02]',
          current ? categoryColor(current) : 'text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600'
        )}
      >
        {current ? <span className="truncate">{current}</span> : 'Set'}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      <AnchoredMenu anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} width={200}>
        <div className="max-h-44 overflow-y-auto">
          {column.options.map((o) => (
            <button
              key={o}
              onClick={(e) => { e.stopPropagation(); onChange(o); setOpen(false); }}
              className="w-full flex items-center px-1.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
            >
              <span className={clsx('px-2 py-0.5 rounded-md text-[11px] font-medium', categoryColor(o))}>{o}</span>
            </button>
          ))}
          {column.options.length === 0 && <div className="px-1.5 py-1 text-[11px] text-gray-400">No options yet.</div>}
          {current && (
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
            placeholder="New option…"
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
