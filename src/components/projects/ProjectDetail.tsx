'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { isToday, isThisWeek, isPast } from 'date-fns';
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
import { ArrowLeft, Pencil, Archive, ListTodo, CheckCircle2, Layers } from 'lucide-react';
import { Task, Project, EventColor, colorClasses } from '@/types';
import { projectProgress, openCount, STATUS_ORDER, STATUS_META, PRIORITY_ORDER, PRIORITY_META } from '@/lib/pm';
import { TaskRow } from './TaskRow';
import { QuickAddRow } from './QuickAddRow';
import { ColumnHeaderRow, StatusSummaryBar } from './boardShared';

type GroupBy = 'none' | 'status' | 'priority' | 'due';

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
  onAddTask: (title: string, overrides?: Partial<Task>) => void;
}

interface Group {
  id: string;
  label: string;
  dot: string;
  override?: Partial<Task>;
  tasks: Task[];
}

const GROUP_OPTIONS: { id: GroupBy; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'due', label: 'Due date' },
];

function dueBucket(t: Task): string {
  if (!t.dueDate) return 'none';
  const d = new Date(t.dueDate);
  if (isToday(d)) return 'today';
  if (isPast(d)) return 'overdue';
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'week';
  return 'later';
}

const DUE_META: Record<string, { label: string; dot: string; order: number }> = {
  overdue: { label: 'Overdue', dot: 'bg-red-500', order: 0 },
  today: { label: 'Today', dot: 'bg-blue-500', order: 1 },
  week: { label: 'This week', dot: 'bg-indigo-500', order: 2 },
  later: { label: 'Later', dot: 'bg-gray-400', order: 3 },
  none: { label: 'No date', dot: 'bg-gray-300', order: 4 },
};

function buildGroups(tasks: Task[], groupBy: GroupBy): Group[] {
  if (groupBy === 'status') {
    return STATUS_ORDER.map((s) => ({
      id: s,
      label: STATUS_META[s].label,
      dot: STATUS_META[s].dot,
      override: { status: s },
      tasks: tasks.filter((t) => t.status === s),
    })).filter((g) => g.tasks.length > 0);
  }
  if (groupBy === 'priority') {
    return PRIORITY_ORDER.map((p) => ({
      id: p,
      label: PRIORITY_META[p].label + ' priority',
      dot: p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-amber-500' : 'bg-gray-400',
      override: { priority: p },
      tasks: tasks.filter((t) => t.priority === p),
    })).filter((g) => g.tasks.length > 0);
  }
  // due
  const byKey = new Map<string, Task[]>();
  tasks.forEach((t) => {
    const k = dueBucket(t);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(t);
  });
  return [...byKey.entries()]
    .map(([k, ts]) => ({ id: k, label: DUE_META[k].label, dot: DUE_META[k].dot, override: undefined, tasks: ts, order: DUE_META[k].order }))
    .sort((a, b) => a.order - b.order);
}

// One sortable table of task rows (used both ungrouped and per group).
function TaskTable({
  tasks,
  accentColor,
  selectedTaskIds,
  onToggleSelect,
  onEditTask,
  onUpdateTask,
  onArchiveTask,
  onReorderTasks,
  onAdd,
}: {
  tasks: Task[];
  accentColor: EventColor;
  selectedTaskIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onArchiveTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
  onAdd: (title: string) => void;
}) {
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

  return (
    <>
      {tasks.length > 0 && <ColumnHeaderRow />}
      {tasks.length === 0 ? (
        <div className="px-8 py-4 text-sm text-gray-400">No tasks here yet.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                accentColor={accentColor}
                selected={selectedTaskIds.has(task.id)}
                onToggleSelect={onToggleSelect}
                onEdit={onEditTask}
                onUpdate={onUpdateTask}
                onArchive={onArchiveTask}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeTask ? <TaskRow task={activeTask} accentColor={accentColor} selected={false} onToggleSelect={() => {}} onEdit={() => {}} onUpdate={() => {}} onArchive={() => {}} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
      <QuickAddRow onAdd={onAdd} />
      {tasks.length > 0 && (
        <div className="px-2.5 py-2 border-t border-gray-100 dark:border-gray-800">
          <StatusSummaryBar tasks={tasks} />
        </div>
      )}
    </>
  );
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
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const accent = colorClasses[project.color] ?? colorClasses.blue;
  const progress = projectProgress(tasks);
  const groups = useMemo(() => (groupBy === 'none' ? null : buildGroups(tasks, groupBy)), [tasks, groupBy]);

  const tableProps = {
    accentColor: project.color,
    selectedTaskIds,
    onToggleSelect,
    onEditTask,
    onUpdateTask,
    onArchiveTask,
    onReorderTasks,
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

      {/* Group-by toolbar */}
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Group by:</span>
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {GROUP_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => setGroupBy(o.id)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                groupBy === o.id ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks */}
      {groups === null ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
          <TaskTable {...tableProps} tasks={tasks} onAdd={(title) => onAddTask(title)} />
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                <span className={clsx('w-2.5 h-2.5 rounded-full', g.dot)} />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{g.label}</h3>
                <span className="text-xs text-gray-400">{g.tasks.length}</span>
              </div>
              <TaskTable {...tableProps} tasks={g.tasks} onAdd={(title) => onAddTask(title, g.override)} />
            </div>
          ))}
          {groups.length === 0 && <div className="py-10 text-center text-sm text-gray-400">No tasks to group yet.</div>}
        </div>
      )}
    </div>
  );
}
