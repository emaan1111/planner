'use client';

import clsx from 'clsx';
import { Undo2, Trash2, FolderArchive, CheckSquare } from 'lucide-react';
import { Task, Project, colorClasses } from '@/types';
import { StatusTag } from './Pills';

interface ArchivedViewProps {
  archivedTasks: Task[];
  archivedProjects: Project[];
  onRestoreTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export function ArchivedView({
  archivedTasks,
  archivedProjects,
  onRestoreTask,
  onDeleteTask,
  onRestoreProject,
  onDeleteProject,
}: ArchivedViewProps) {
  const empty = archivedTasks.length === 0 && archivedProjects.length === 0;

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FolderArchive className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">Nothing archived. Archived tasks and projects show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {archivedProjects.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
            <FolderArchive className="w-4 h-4" /> Archived Projects ({archivedProjects.length})
          </h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {archivedProjects.map((p) => {
              const accent = colorClasses[p.color] ?? colorClasses.blue;
              return (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <span className={clsx('w-2.5 h-2.5 rounded-full', accent.bg)} />
                  <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{p.name}</span>
                  <button onClick={() => onRestoreProject(p.id)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <Undo2 className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button onClick={() => onDeleteProject(p.id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete permanently">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {archivedTasks.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
            <CheckSquare className="w-4 h-4" /> Archived Tasks ({archivedTasks.length})
          </h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {archivedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <StatusTag status={t.status} />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">{t.title}</span>
                <button onClick={() => onRestoreTask(t.id)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  <Undo2 className="w-3.5 h-3.5" /> Restore
                </button>
                <button onClick={() => onDeleteTask(t.id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete permanently">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
