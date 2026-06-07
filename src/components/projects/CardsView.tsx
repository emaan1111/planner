'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';
import { MoreVertical, Archive, Pencil, ListTodo } from 'lucide-react';
import { useState } from 'react';
import { Task, Project, colorClasses } from '@/types';
import { projectProgress, openCount } from '@/lib/pm';
import { ProgressBar } from './ProgressBar';
import { StatusTag } from './Pills';

interface CardsViewProps {
  projects: Project[];
  tasksByProject: Map<string, Task[]>;
  noProjectTasks: Task[];
  onOpenProject: (projectId: string) => void;
  onEditProject: (project: Project) => void;
  onArchiveProject: (projectId: string) => void;
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
  const accent = colorClasses[project.color] ?? colorClasses.blue;
  const progress = projectProgress(tasks);
  const open = openCount(tasks);
  const preview = tasks.filter((t) => t.status !== 'done').slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={clsx('h-1.5', accent.bg)} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <button onClick={onOpen} className="flex items-center gap-2 min-w-0 text-left">
            <span className={clsx('w-3 h-3 rounded-full flex-shrink-0', accent.bg)} />
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{project.name}</h3>
          </button>
          <div className="relative flex-shrink-0">
            <button onClick={() => setMenuOpen((v) => !v)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded">
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <button className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} aria-hidden tabIndex={-1} />
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

        {project.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{project.description}</p>}

        <ProgressBar percent={progress} color={project.color} className="mb-3" />

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center gap-1"><ListTodo className="w-3.5 h-3.5" /> {open} open</span>
          <span>{tasks.length} total</span>
        </div>

        <div className="space-y-1.5">
          {preview.length === 0 ? (
            <p className="text-xs text-gray-400 italic">All clear 🎉</p>
          ) : (
            preview.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <StatusTag status={t.status} />
                <span className="truncate text-gray-700 dark:text-gray-300">{t.title}</span>
              </div>
            ))
          )}
          {open > 3 && <button onClick={onOpen} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+{open - 3} more</button>}
        </div>
      </div>
    </motion.div>
  );
}

export function CardsView({ projects, tasksByProject, noProjectTasks, onOpenProject, onEditProject, onArchiveProject }: CardsViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      {noProjectTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
        >
          <h3 className="text-base font-bold text-gray-600 dark:text-gray-300 mb-3">No project</h3>
          <ProgressBar percent={projectProgress(noProjectTasks)} color="gray" className="mb-3" />
          <p className="text-xs text-gray-500">{openCount(noProjectTasks)} open · {noProjectTasks.length} total</p>
        </motion.div>
      )}
    </div>
  );
}
