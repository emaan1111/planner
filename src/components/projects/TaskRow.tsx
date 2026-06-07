'use client';

import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, Archive, MoreHorizontal } from 'lucide-react';
import { Task } from '@/types';
import { StatusPill, PriorityPill } from './Pills';

export interface TaskRowProps {
  task: Task;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (task: Task) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onArchive: (id: string) => void;
  isDragOverlay?: boolean;
}

export function TaskRow({
  task,
  selected,
  onToggleSelect,
  onEdit,
  onUpdate,
  onArchive,
  isDragOverlay,
}: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group flex items-center gap-2 pl-2 pr-3 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors',
        selected && 'bg-blue-50/60 dark:bg-blue-900/10',
        !isDragOverlay && 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isDragging && !isDragOverlay && 'opacity-30',
        isDragOverlay && 'shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700',
        task.status === 'done' && 'opacity-60'
      )}
    >
      {/* drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* select */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(task.id)}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-label={`Select ${task.title}`}
      />

      {/* title */}
      <button
        onClick={() => onEdit(task)}
        className={clsx(
          'flex-1 min-w-0 text-left text-sm font-medium truncate',
          task.status === 'done'
            ? 'text-gray-400 dark:text-gray-500 line-through'
            : 'text-gray-900 dark:text-white'
        )}
      >
        {task.title}
      </button>

      {/* due date */}
      {task.dueDate && (
        <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
          <Clock className="w-3 h-3" />
          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      )}

      {/* priority */}
      <div className="flex-shrink-0">
        <PriorityPill priority={task.priority} onChange={(p) => onUpdate(task.id, { priority: p })} />
      </div>

      {/* status */}
      <div className="flex-shrink-0">
        <StatusPill status={task.status} onChange={(s) => onUpdate(task.id, { status: s })} />
      </div>

      {/* archive */}
      {!isDragOverlay && (
        <button
          onClick={() => onArchive(task.id)}
          className="flex-shrink-0 p-1 text-gray-300 hover:text-amber-600 dark:text-gray-600 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Archive task"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      )}
      {isDragOverlay && <MoreHorizontal className="w-4 h-4 text-gray-300 flex-shrink-0" />}
    </div>
  );
}
