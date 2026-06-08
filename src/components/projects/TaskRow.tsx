'use client';

import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, Archive } from 'lucide-react';
import { Task, EventColor, colorClasses } from '@/types';
import { BOARD_GRID, DETAIL_GRID } from '@/lib/pm';
import { StatusPill, PriorityPill } from './Pills';
import { CategoryPill } from './CategoryPill';

export interface TaskRowProps {
  task: Task;
  accentColor?: EventColor;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onArchive: (id: string) => void;
  isDragOverlay?: boolean;
  /** When provided, render an editable Category column with these suggestions. */
  categories?: string[];
}

export function TaskRow({
  task,
  accentColor,
  selected,
  onToggleSelect,
  onEdit,
  onUpdate,
  onArchive,
  isDragOverlay,
  categories,
}: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });
  const withCategory = categories !== undefined;
  const style = { transform: CSS.Transform.toString(transform), transition, gridTemplateColumns: withCategory ? DETAIL_GRID : BOARD_GRID };
  const accent = accentColor ? colorClasses[accentColor] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group grid items-center gap-2 pl-2.5 pr-2.5 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors border-l-[3px]',
        accent ? accent.border : 'border-l-transparent',
        selected && 'bg-blue-50/60 dark:bg-blue-900/10',
        !isDragOverlay && 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isDragging && !isDragOverlay && 'opacity-30',
        isDragOverlay && 'shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700',
        task.status === 'done' && 'opacity-60'
      )}
    >
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 flex items-center justify-center"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(task.id)}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-label={`Select ${task.title}`}
      />

      <button
        onClick={() => onEdit(task)}
        className={clsx(
          'min-w-0 text-left text-sm font-medium truncate',
          task.status === 'done' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'
        )}
      >
        {task.title}
      </button>

      {/* category */}
      {withCategory && (
        <div className="flex justify-center min-w-0">
          <CategoryPill value={task.category} categories={categories!} onChange={(c) => onUpdate(task.id, { category: c })} />
        </div>
      )}

      {/* status */}
      <div className="flex justify-center">
        <StatusPill status={task.status} onChange={(s) => onUpdate(task.id, { status: s })} fullWidth />
      </div>

      {/* priority */}
      <div className="flex justify-center">
        <PriorityPill priority={task.priority} onChange={(p) => onUpdate(task.id, { priority: p })} />
      </div>

      {/* due */}
      <div className="flex justify-center">
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
        )}
      </div>

      {/* archive */}
      {!isDragOverlay ? (
        <button
          onClick={() => onArchive(task.id)}
          className="p-1 text-gray-300 hover:text-amber-600 dark:text-gray-600 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          title="Archive task"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
