'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { ChevronRight, MoreVertical, Archive, Pencil, GripVertical } from 'lucide-react';
import { Task, colorClasses, EventColor } from '@/types';
import { projectProgress } from '@/lib/pm';
import { TaskRow } from './TaskRow';
import { QuickAddRow } from './QuickAddRow';
import { ColumnHeaderRow, StatusSummaryBar } from './boardShared';

// Loose typing for the dnd-kit drag handle props passed down from a sortable wrapper.
export interface DragHandleProps {
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
}

export interface ProjectGroupProps {
  id: string;
  name: string;
  color: EventColor;
  tasks: Task[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedTaskIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onArchiveTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
  onAddTask?: (title: string) => void;
  onArchiveProject?: () => void;
  onEditProject?: () => void;
  dragHandleProps?: DragHandleProps;
}

export function ProjectGroup({
  name,
  color,
  tasks,
  collapsed,
  onToggleCollapse,
  selectedTaskIds,
  onToggleSelect,
  onEditTask,
  onUpdateTask,
  onArchiveTask,
  onReorderTasks,
  onAddTask,
  onArchiveProject,
  onEditProject,
  dragHandleProps,
}: ProjectGroupProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const accent = colorClasses[color] ?? colorClasses.blue;
  const progress = projectProgress(tasks);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = (e: DragStartEvent) => setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null);
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) onReorderTasks(arrayMove(tasks, oldIndex, newIndex).map((t) => t.id));
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      {/* Group header */}
      <div className={clsx('flex items-center gap-2 px-2.5 py-2 border-l-4', accent.border, accent.light, 'dark:bg-gray-800/40')}>
        {dragHandleProps && (
          <button
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            className="cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0"
            aria-label="Drag to reorder project"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <button onClick={onToggleCollapse} className="p-0.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          <ChevronRight className={clsx('w-4 h-4 transition-transform', !collapsed && 'rotate-90')} />
        </button>
        <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', accent.bg)} />
        <h3 className={clsx('text-sm font-bold truncate', accent.text)}>{name}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{tasks.length}</span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{progress}%</span>
          {(onArchiveProject || onEditProject) && (
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded">
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <button className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} aria-hidden tabIndex={-1} />
                  <div className="absolute right-0 z-40 mt-1 min-w-[140px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1">
                    {onEditProject && (
                      <button onClick={() => { setMenuOpen(false); onEditProject(); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <Pencil className="w-3.5 h-3.5" /> Edit project
                      </button>
                    )}
                    {onArchiveProject && (
                      <button onClick={() => { setMenuOpen(false); onArchiveProject(); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                        <Archive className="w-3.5 h-3.5" /> Archive project
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div>
          {tasks.length > 0 && <ColumnHeaderRow />}
          {tasks.length === 0 ? (
            <div className="px-8 py-3 text-xs text-gray-400 dark:text-gray-500">No tasks yet — add one below.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    accentColor={color}
                    selected={selectedTaskIds.has(task.id)}
                    onToggleSelect={onToggleSelect}
                    onEdit={onEditTask}
                    onUpdate={onUpdateTask}
                    onArchive={onArchiveTask}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeTask ? (
                  <TaskRow task={activeTask} accentColor={color} selected={false} onToggleSelect={() => {}} onEdit={() => {}} onUpdate={() => {}} onArchive={() => {}} isDragOverlay />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
          {onAddTask && <QuickAddRow onAdd={onAddTask} />}
          {tasks.length > 0 && (
            <div className="px-2.5 py-2 border-t border-gray-100 dark:border-gray-800">
              <StatusSummaryBar tasks={tasks} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
