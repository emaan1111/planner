'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';
import { MoreVertical, Archive, Pencil, ListTodo, ArrowRight, CheckCircle2, GripVertical } from 'lucide-react';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Project, colorClasses } from '@/types';
import { projectProgress, openCount } from '@/lib/pm';

interface CardsViewProps {
  projects: Project[];
  tasksByProject: Map<string, Task[]>;
  noProjectTasks: Task[];
  onOpenProject: (projectId: string) => void;
  onEditProject: (project: Project) => void;
  onArchiveProject: (projectId: string) => void;
  onReorderProjects: (orderedIds: string[]) => void;
}

function ProjectCard({
  project,
  tasks,
  onOpen,
  onEdit,
  onArchive,
}: {
  project: Project;
  tasks: Task[];
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id: project.id });
  const accent = colorClasses[project.color] ?? colorClasses.blue;
  const progress = projectProgress(tasks);
  const open = openCount(tasks);
  const done = tasks.filter((t) => t.status === 'done' && !t.archived).length;
  const preview = tasks.filter((t) => t.status !== 'done').slice(0, 3);
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={clsx('relative', isDragging && 'opacity-50 z-10')}>
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={clsx('relative w-full text-left rounded-3xl overflow-hidden shadow-lg group', accent.bg)}
    >
      {/* gradient sheen overlay for depth on any project color */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/30 pointer-events-none" />

      <div className="relative p-5 text-white min-h-[200px] flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing touch-none text-white/60 hover:text-white -ml-1 flex-shrink-0"
              title="Drag to reorder"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </span>
            <h3 className="text-xl font-extrabold tracking-tight drop-shadow-sm pr-2 truncate">{project.name}</h3>
          </div>
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMenuOpen((v) => !v)} className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20">
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <span className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="absolute right-0 z-40 mt-1 min-w-[140px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1">
                  <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setMenuOpen(false); onArchive(); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {project.description && <p className="text-sm text-white/85 mb-4 line-clamp-2">{project.description}</p>}

        {/* big progress ring-ish number */}
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-black leading-none drop-shadow">{progress}%</span>
          <span className="text-xs text-white/80 mb-1">complete</span>
        </div>
        <div className="h-2 rounded-full bg-black/20 overflow-hidden mb-4">
          <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center gap-4 text-xs text-white/90 mb-3">
          <span className="flex items-center gap-1"><ListTodo className="w-3.5 h-3.5" /> {open} open</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {done} done</span>
        </div>

        <div className="mt-auto space-y-1">
          {preview.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
              <span className="truncate">{t.title}</span>
            </div>
          ))}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-white pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
            Open project <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </motion.button>
    </div>
  );
}

export function CardsView({ projects, tasksByProject, noProjectTasks, onOpenProject, onEditProject, onArchiveProject, onReorderProjects }: CardsViewProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (projects.length === 0 && noProjectTasks.length === 0) {
    return <div className="py-16 text-center text-sm text-gray-400">No projects yet — create one to see cards here.</div>;
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderProjects(arrayMove(projects, oldIndex, newIndex).map((p) => p.id));
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={projects.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={tasksByProject.get(project.id) ?? []}
              onOpen={() => onOpenProject(project.id)}
              onEdit={() => onEditProject(project)}
              onArchive={() => onArchiveProject(project.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
