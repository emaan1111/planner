'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { Clock } from 'lucide-react';
import { Task, Project, TaskStatus, colorClasses } from '@/types';
import { KANBAN_COLUMNS, STATUS_META, PRIORITY_META } from '@/lib/pm';

interface KanbanViewProps {
  tasks: Task[];
  projects: Project[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
}

function KanbanCard({ task, project, onEdit, isOverlay }: { task: Task; project?: Project; onEdit?: (t: Task) => void; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });
  const accent = project ? colorClasses[project.color] : null;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onEdit?.(task)}
      className={clsx(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 cursor-grab active:cursor-grabbing touch-none border-l-4 shadow-sm hover:shadow-md transition-shadow',
        accent ? accent.border : 'border-l-gray-300',
        isDragging && !isOverlay && 'opacity-30',
        isOverlay && 'shadow-2xl rotate-2'
      )}
    >
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1.5 line-clamp-2">{task.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {project && (
          <span className={clsx('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full', accent?.light, accent?.text)}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', accent?.bg)} />
            {project.name}
          </span>
        )}
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium', PRIORITY_META[task.priority].pill)}>
          {PRIORITY_META[task.priority].label}
        </span>
        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ status, tasks, projectsById, onEdit }: { status: TaskStatus; tasks: Task[]; projectsById: Map<string, Project>; onEdit: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  return (
    <div className="flex-1 min-w-[230px] flex flex-col">
      <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-t-xl', meta.columnTint)}>
        <span className={clsx('w-2.5 h-2.5 rounded-full', meta.dot)} />
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{meta.label}</span>
        <span className="text-xs text-gray-400 ml-auto">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 space-y-2 p-2 rounded-b-xl border border-t-0 border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 min-h-[120px] transition-colors',
          isOver && 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-700'
        )}
      >
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} project={task.projectId ? projectsById.get(task.projectId) : undefined} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

export function KanbanView({ tasks, projects, onUpdateTask, onEditTask }: KanbanViewProps) {
  const [filterProject, setFilterProject] = useState<string>('all');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const visible = useMemo(
    () => tasks.filter((t) => filterProject === 'all' || t.projectId === filterProject),
    [tasks, filterProject]
  );
  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    KANBAN_COLUMNS.forEach((s) => map.set(s, []));
    visible.forEach((t) => {
      const col: TaskStatus = KANBAN_COLUMNS.includes(t.status) ? t.status : 'todo';
      map.get(col)!.push(t);
    });
    return map;
  }, [visible]);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = visible.find((t) => t.id === active.id);
    if (task && task.status !== newStatus && KANBAN_COLUMNS.includes(newStatus)) {
      onUpdateTask(task.id, { status: newStatus });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Project:</span>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-200"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveTask(visible.find((t) => t.id === e.active.id) ?? null)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn key={status} status={status} tasks={byStatus.get(status) ?? []} projectsById={projectsById} onEdit={onEditTask} />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} project={activeTask.projectId ? projectsById.get(activeTask.projectId) : undefined} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
