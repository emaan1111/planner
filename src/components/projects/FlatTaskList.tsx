'use client';

import { useState } from 'react';
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
import { Task, Project } from '@/types';
import { ResolvedColumn } from '@/lib/pm';
import { TaskRow } from './TaskRow';
import { QuickAddRow } from './QuickAddRow';
import { ColumnHeaderRow, StatusSummaryBar } from './boardShared';

interface FlatTaskListProps {
  tasks: Task[];
  columns: ResolvedColumn[];
  projectsById: Map<string, Project>;
  categories: string[];
  typeOptions: string[];
  onAddColumnOption: (columnId: string, option: string) => void;
  selectedTaskIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onArchiveTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
  onAddTask: (title: string) => void;
}

// A single, ungrouped table of every active task — the "All tasks" view that
// shows tasks flat (with a Project column) instead of split into project groups.
export function FlatTaskList({
  tasks,
  columns,
  projectsById,
  categories,
  typeOptions,
  onAddColumnOption,
  selectedTaskIds,
  onToggleSelect,
  onEditTask,
  onUpdateTask,
  onArchiveTask,
  onReorderTasks,
  onAddTask,
}: FlatTaskListProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) onReorderTasks(arrayMove(tasks, oldIndex, newIndex).map((t) => t.id));
    }
  };

  const accentFor = (task: Task) => (task.projectId ? projectsById.get(task.projectId)?.color : undefined);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      {tasks.length > 0 && <ColumnHeaderRow columns={columns} />}
      {tasks.length === 0 ? (
        <div className="px-8 py-4 text-sm text-gray-400">No tasks yet — add one below.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                columns={columns}
                accentColor={accentFor(task)}
                categories={categories}
                typeOptions={typeOptions}
                projectsById={projectsById}
                onAddColumnOption={onAddColumnOption}
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
              <TaskRow task={activeTask} columns={columns} accentColor={accentFor(activeTask)} categories={categories} typeOptions={typeOptions} projectsById={projectsById} selected={false} onToggleSelect={() => {}} onEdit={() => {}} onUpdate={() => {}} onArchive={() => {}} isDragOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
      <QuickAddRow onAdd={onAddTask} />
      {tasks.length > 0 && (
        <div className="px-2.5 py-2 border-t border-gray-100 dark:border-gray-800">
          <StatusSummaryBar tasks={tasks} />
        </div>
      )}
    </div>
  );
}
