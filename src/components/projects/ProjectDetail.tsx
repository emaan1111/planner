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
import { ArrowLeft, Pencil, Archive, ListTodo, CheckCircle2 } from 'lucide-react';
import { Task, Project, colorClasses } from '@/types';
import { projectProgress, openCount } from '@/lib/pm';
import { TaskRow } from './TaskRow';
import { QuickAddRow } from './QuickAddRow';
import { ColumnHeaderRow, StatusSummaryBar } from './boardShared';

interface ProjectDetailProps {
  project: Project;
  tasks: Task[];
  selectedTaskIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onBack: () => void;
  onEditProject: (project: Project) => void;
  onArchiveProject: (id: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onArchiveTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
  onAddTask: (title: string) => void;
}

export function ProjectDetail({
  project,
  tasks,
  selectedTaskIds,
  onToggleSelect,
  onBack,
  onEditProject,
  onArchiveProject,
  onEditTask,
  onUpdateTask,
  onArchiveTask,
  onReorderTasks,
  onAddTask,
}: ProjectDetailProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const accent = colorClasses[project.color] ?? colorClasses.blue;
  const progress = projectProgress(tasks);
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

  return (
    <div className="space-y-4">
      {/* Gradient header */}
      <div className={clsx('relative rounded-3xl overflow-hidden shadow-lg', accent.bg)}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/30 pointer-events-none" />
        <div className="relative p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onBack} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-2xl font-extrabold tracking-tight truncate drop-shadow-sm">{project.name}</h2>
                {project.description && <p className="text-sm text-white/85 truncate">{project.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onEditProject(project)} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors" title="Edit project">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onArchiveProject(project.id)} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors" title="Archive project">
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-end gap-2 mt-4">
            <span className="text-4xl font-black leading-none drop-shadow">{progress}%</span>
            <span className="text-xs text-white/80 mb-1">complete</span>
            <div className="flex items-center gap-4 text-xs text-white/90 ml-auto">
              <span className="flex items-center gap-1"><ListTodo className="w-3.5 h-3.5" /> {openCount(tasks)} open</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {tasks.filter((t) => t.status === 'done').length} done</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-black/20 overflow-hidden mt-2">
            <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Task table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        {tasks.length > 0 && <ColumnHeaderRow />}
        {tasks.length === 0 ? (
          <div className="px-8 py-4 text-sm text-gray-400">No tasks yet — add the first one below.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  accentColor={project.color}
                  selected={selectedTaskIds.has(task.id)}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEditTask}
                  onUpdate={onUpdateTask}
                  onArchive={onArchiveTask}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeTask ? <TaskRow task={activeTask} accentColor={project.color} selected={false} onToggleSelect={() => {}} onEdit={() => {}} onUpdate={() => {}} onArchive={() => {}} isDragOverlay /> : null}
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
    </div>
  );
}
