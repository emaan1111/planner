'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Tag, X } from 'lucide-react';

// Stable chip color per category name (hashed into a small palette).
const CATEGORY_COLORS = [
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
];

const CATEGORY_DOTS = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500'];

function hashIndex(name: string, len: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash % len;
}

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[hashIndex(name, CATEGORY_COLORS.length)];
}

export function categoryDot(name: string): string {
  return CATEGORY_DOTS[hashIndex(name, CATEGORY_DOTS.length)];
}

interface CategoryPillProps {
  value?: string;
  categories: string[];
  onChange: (category: string | undefined) => void;
}

export function CategoryPill({ value, categories, onChange }: CategoryPillProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

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
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={clsx(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium max-w-full transition-transform hover:scale-[1.02]',
          value ? categoryColor(value) : 'text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600'
        )}
      >
        {value ? <span className="truncate">{value}</span> : <><Tag className="w-3 h-3" /> Set</>}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} aria-hidden tabIndex={-1} />
          <div className="absolute z-40 mt-1 left-0 min-w-[180px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1.5">
            <div className="max-h-44 overflow-y-auto">
              {categories.map((c) => (
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
                placeholder="New category…"
                className="flex-1 min-w-0 px-1.5 py-1 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
              />
              <button onClick={(e) => { e.stopPropagation(); addNew(); }} disabled={!draft.trim()} className="p-1 rounded-md bg-indigo-500 text-white disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
