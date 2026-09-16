'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Inbox, Sparkles, ChevronRight, Archive, MoonStar, ListPlus } from 'lucide-react';
import { Task, Project } from '@/types';
import { hasMultipleLines } from '@/lib/taskLines';
import { MultiLineTaskInput } from './MultiLineTaskInput';

interface InboxBarProps {
  inboxTasks: Task[];
  projects: Project[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCapture: (title: string) => void;
  onCaptureMany: (titles: string[]) => void;
  onTriage: (taskId: string, projectId: string) => void;
  onSomeday: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

// Always-visible quick-capture bar. Dump a thought; triage it later. The list
// button (or pasting a list) captures several at once, one task per line.
export function InboxBar({
  inboxTasks,
  projects,
  collapsed,
  onToggleCollapse,
  onCapture,
  onCaptureMany,
  onTriage,
  onSomeday,
  onArchive,
  onEdit,
}: InboxBarProps) {
  const [value, setValue] = useState('');
  // Non-null = multi-line mode, holding the seed text for the box.
  const [multi, setMulti] = useState<string | null>(null);

  const submit = () => {
    const title = value.trim();
    if (!title) return;
    onCapture(title);
    setValue('');
  };

  const submitMany = (titles: string[]) => {
    if (titles.length === 1) onCapture(titles[0]);
    else onCaptureMany(titles);
    setMulti(null);
    setValue('');
  };

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-900 overflow-hidden">
      {/* Capture input */}
      {multi !== null ? (
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            <ListPlus className="w-3.5 h-3.5" /> Capture several — one per line
          </div>
          <MultiLineTaskInput
            initialValue={multi}
            placeholder="One task or idea per line…"
            submitLabel={(n) => `Capture ${n}`}
            onSubmit={submitMany}
            onCancel={() => setMulti(null)}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (!hasMultipleLines(text)) return;
              e.preventDefault();
              const typed = value.trim();
              setMulti(typed ? `${typed}\n${text}` : text);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Dump a task or idea… (Enter to capture)"
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setMulti(value)}
            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 transition-colors"
            title="Capture several tasks — one per line"
          >
            <ListPlus className="w-4 h-4" />
          </button>
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="px-3 py-1 rounded-lg bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40 hover:bg-indigo-600 transition-colors"
          >
            Capture
          </button>
        </div>
      )}

      {/* Inbox list */}
      {inboxTasks.length > 0 && (
        <div className="border-t border-indigo-100 dark:border-indigo-900/40">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20"
          >
            <ChevronRight className={clsx('w-3.5 h-3.5 transition-transform', !collapsed && 'rotate-90')} />
            <Inbox className="w-3.5 h-3.5" />
            Inbox
            <span className="text-indigo-400">{inboxTasks.length}</span>
          </button>
          {!collapsed && (
            <div>
              {inboxTasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-2 px-3 py-1.5 border-t border-indigo-50 dark:border-indigo-900/30 hover:bg-white dark:hover:bg-gray-800/50"
                >
                  <button onClick={() => onEdit(task)} className="flex-1 min-w-0 text-left text-sm text-gray-800 dark:text-gray-100 truncate">
                    {task.title}
                  </button>
                  <select
                    value=""
                    onChange={(e) => e.target.value && onTriage(task.id, e.target.value)}
                    className="text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 px-1.5 py-1 max-w-[140px]"
                    title="Move to a project"
                  >
                    <option value="">Triage to…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onSomeday(task.id)}
                    className="p-1 text-gray-400 hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Move to Someday"
                  >
                    <MoonStar className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onArchive(task.id)}
                    className="p-1 text-gray-400 hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
