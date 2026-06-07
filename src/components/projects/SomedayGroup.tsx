'use client';

import clsx from 'clsx';
import { ChevronRight, MoonStar, Undo2, Archive } from 'lucide-react';
import { Task } from '@/types';
import { PriorityPill } from './Pills';

interface SomedayGroupProps {
  tasks: Task[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRevive: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onEdit: (task: Task) => void;
}

// Parked ideas. Hidden from the weekly/active flow until revived.
export function SomedayGroup({ tasks, collapsed, onToggleCollapse, onRevive, onArchive, onUpdate, onEdit }: SomedayGroupProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 overflow-hidden bg-white dark:bg-gray-900">
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400"
      >
        <ChevronRight className={clsx('w-4 h-4 text-purple-500 transition-transform', !collapsed && 'rotate-90')} />
        <MoonStar className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300">Someday / Maybe</h3>
        <span className="text-xs text-purple-400">{tasks.length}</span>
      </button>
      {!collapsed && (
        <div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-2 pl-8 pr-3 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <button onClick={() => onEdit(task)} className="flex-1 min-w-0 text-left text-sm text-gray-700 dark:text-gray-200 truncate">
                {task.title}
              </button>
              <PriorityPill priority={task.priority} onChange={(p) => onUpdate(task.id, { priority: p })} />
              <button
                onClick={() => onRevive(task.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                title="Revive into active"
              >
                <Undo2 className="w-3.5 h-3.5" /> Revive
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
  );
}
