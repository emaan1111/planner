'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { parseTaskLines } from '@/lib/taskLines';

interface MultiLineTaskInputProps {
  /** Seed text (e.g. a pasted list or what was typed before switching modes). */
  initialValue?: string;
  placeholder?: string;
  /** Label for the submit button given the number of tasks it will create. */
  submitLabel?: (count: number) => string;
  onSubmit: (titles: string[]) => void;
  onCancel: () => void;
}

const plural = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

// Free-text box where every non-empty line becomes its own task. Bullets,
// numbering and checkbox markers are stripped. ⌘/Ctrl+Enter adds, Esc cancels.
export function MultiLineTaskInput({
  initialValue = '',
  placeholder = 'One task per line…',
  submitLabel,
  onSubmit,
  onCancel,
}: MultiLineTaskInputProps) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLTextAreaElement>(null);
  const titles = useMemo(() => parseTaskLines(value), [value]);
  const count = titles.length;

  // Focus with the caret at the end so typing continues after any seed text.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const submit = () => {
    if (count === 0) return;
    onSubmit(titles);
  };

  const rows = Math.min(12, Math.max(3, value.split('\n').length + 1));

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        className="w-full resize-none rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-gray-900 px-3 py-2 text-sm leading-6 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
      />
      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className={count > 0 ? 'font-medium text-indigo-600 dark:text-indigo-300' : undefined}>
          {count === 0 ? 'Each line becomes a task' : plural(count)}
        </span>
        <span className="hidden sm:inline text-gray-400">· ⌘/Ctrl+Enter to add · Esc to cancel</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={count === 0}
            className="px-3 py-1 rounded-md bg-indigo-500 text-white font-semibold disabled:opacity-40 hover:bg-indigo-600 transition-colors"
          >
            {submitLabel ? submitLabel(count) : `Add ${plural(count)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
