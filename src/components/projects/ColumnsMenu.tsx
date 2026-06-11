'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Columns3, Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { ADDABLE_COLUMNS } from '@/lib/pm';
import { TaskColumn, CustomFieldType } from '@/types';
import { AnchoredMenu } from './AnchoredMenu';

interface ColumnsMenuProps {
  enabled: Record<'type' | 'category', boolean>;
  onToggle: (key: 'type' | 'category') => void;
  customColumns: TaskColumn[];
  onAddColumn: (input: { name: string; type: CustomFieldType; options: string[] }) => void;
  onDeleteColumn: (id: string) => void;
}

const TYPE_OPTIONS: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
];

// Dropdown to manage list-view columns: toggle built-ins (Type, Category) and
// add / remove custom columns of varying types.
export function ColumnsMenu({ enabled, onToggle, customColumns, onAddColumn, onDeleteColumn }: ColumnsMenuProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [optionsText, setOptionsText] = useState('');
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const activeCount = ADDABLE_COLUMNS.filter((c) => enabled[c.key]).length + customColumns.length;

  const resetForm = () => { setName(''); setType('text'); setOptionsText(''); setAdding(false); };
  const submit = () => {
    const n = name.trim();
    if (!n) return;
    const options = type === 'select' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : [];
    onAddColumn({ name: n, type, options });
    resetForm();
  };

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
      <AnchoredMenu anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} align="right" width={260}>
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Built-in</div>
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

        {customColumns.length > 0 && (
          <>
            <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Custom columns</div>
            {customColumns.map((c) => (
              <div key={c.id} className="group w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-xs text-gray-700 dark:text-gray-200">
                <span className="flex-1 min-w-0 truncate">{c.name}</span>
                <span className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-gray-500 flex-shrink-0">{c.type}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteColumn(c.id); }}
                  className="p-0.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 flex-shrink-0"
                  title="Delete column"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </>
        )}

        <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-800">
          {adding ? (
            <div className="p-1.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && type !== 'select') submit(); }}
                placeholder="Column name…"
                autoFocus
                className="w-full px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomFieldType)}
                className="w-full px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
              >
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {type === 'select' && (
                <input
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Options, comma-separated"
                  className="w-full px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                />
              )}
              <div className="flex items-center gap-1.5">
                <button onClick={submit} disabled={!name.trim()} className="flex-1 px-2 py-1 rounded-md bg-indigo-500 text-white text-xs font-medium disabled:opacity-40">
                  Add column
                </button>
                <button onClick={resetForm} className="px-2 py-1 rounded-md text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setAdding(true); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left"
            >
              <Plus className="w-3.5 h-3.5" /> Add custom column
            </button>
          )}
        </div>
      </AnchoredMenu>
    </>
  );
}
