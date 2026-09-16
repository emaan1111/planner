'use client';

import { useState } from 'react';
import { Plus, ListPlus } from 'lucide-react';
import { hasMultipleLines } from '@/lib/taskLines';
import { MultiLineTaskInput } from './MultiLineTaskInput';

interface QuickAddRowProps {
  placeholder?: string;
  onAdd: (title: string) => void;
  /** Create several tasks at once (one per line). Falls back to onAdd per line. */
  onAddMany?: (titles: string[]) => void;
}

// Inline "+ Add task" row that stays focused for rapid entry. The list button
// (or pasting a multi-line list) switches to a box where every line becomes
// its own task.
export function QuickAddRow({ placeholder = '+ Add task', onAdd, onAddMany }: QuickAddRowProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  // Non-null = multi-line mode, holding the seed text for the box.
  const [multi, setMulti] = useState<string | null>(null);

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    onAdd(title);
    setValue('');
  };

  const submitMany = (titles: string[]) => {
    if (titles.length === 1) onAdd(titles[0]);
    else if (onAddMany) onAddMany(titles);
    else titles.forEach(onAdd);
    setMulti(null);
    setValue('');
  };

  if (multi !== null) {
    return (
      <div className="pl-8 pr-3 py-2 bg-white dark:bg-gray-900">
        <MultiLineTaskInput initialValue={multi} onSubmit={submitMany} onCancel={() => setMulti(null)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pl-8 pr-3 py-1.5 bg-white dark:bg-gray-900">
      {!focused && !value && <Plus className="w-3.5 h-3.5 text-gray-400" />}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={(e) => {
          // Pasting a list opens the multi-line box with it, ready to add.
          const text = e.clipboardData.getData('text');
          if (!hasMultipleLines(text)) return;
          e.preventDefault();
          const typed = value.trim();
          setMulti(typed ? `${typed}\n${text}` : text);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') {
            setValue('');
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setMulti(value)}
        className="p-1 rounded-md text-gray-300 dark:text-gray-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
        title="Add several tasks — one per line"
      >
        <ListPlus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
