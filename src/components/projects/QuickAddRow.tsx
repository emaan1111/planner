'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface QuickAddRowProps {
  placeholder?: string;
  onAdd: (title: string) => void;
}

// Inline "+ Add task" row that stays focused for rapid entry.
export function QuickAddRow({ placeholder = '+ Add task', onAdd }: QuickAddRowProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    onAdd(title);
    setValue('');
  };

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
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') {
            setValue('');
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none"
      />
    </div>
  );
}
