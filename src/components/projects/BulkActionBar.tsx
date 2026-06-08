'use client';

import { motion } from 'framer-motion';
import { Archive, Trash2, MoonStar, X, FolderInput, Flag, CircleDot, Copy } from 'lucide-react';
import { Project, TaskStatus, TaskPriority } from '@/types';
import { STATUS_ORDER, STATUS_META, PRIORITY_ORDER, PRIORITY_META } from '@/lib/pm';

interface BulkActionBarProps {
  count: number;
  projects: Project[];
  onClear: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSomeday: () => void;
  onSetProject: (projectId: string) => void;
  onCopyToProject: (projectId: string) => void;
  onSetStatus: (status: TaskStatus) => void;
  onSetPriority: (priority: TaskPriority) => void;
}

// Floating action bar shown when one or more tasks are selected.
export function BulkActionBar({
  count,
  projects,
  onClear,
  onArchive,
  onDelete,
  onSomeday,
  onSetProject,
  onCopyToProject,
  onSetStatus,
  onSetPriority,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 px-3 py-2 rounded-2xl bg-gray-900 dark:bg-gray-800 text-white shadow-2xl border border-gray-700"
    >
      <span className="text-sm font-semibold px-2">{count} selected</span>
      <div className="w-px h-5 bg-gray-700" />

      {/* Move to project */}
      <div className="relative flex items-center gap-1">
        <FolderInput className="w-4 h-4 text-gray-300" />
        <select
          value=""
          onChange={(e) => e.target.value && onSetProject(e.target.value)}
          className="bg-gray-800 dark:bg-gray-700 text-xs rounded-md px-1.5 py-1 border border-gray-700"
        >
          <option value="">Move to…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Copy to project */}
      <div className="relative flex items-center gap-1">
        <Copy className="w-4 h-4 text-gray-300" />
        <select
          value=""
          onChange={(e) => e.target.value && onCopyToProject(e.target.value)}
          className="bg-gray-800 dark:bg-gray-700 text-xs rounded-md px-1.5 py-1 border border-gray-700"
        >
          <option value="">Copy to…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Set status */}
      <div className="relative flex items-center gap-1">
        <CircleDot className="w-4 h-4 text-gray-300" />
        <select
          value=""
          onChange={(e) => e.target.value && onSetStatus(e.target.value as TaskStatus)}
          className="bg-gray-800 dark:bg-gray-700 text-xs rounded-md px-1.5 py-1 border border-gray-700"
        >
          <option value="">Status…</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {/* Set priority */}
      <div className="relative flex items-center gap-1">
        <Flag className="w-4 h-4 text-gray-300" />
        <select
          value=""
          onChange={(e) => e.target.value && onSetPriority(e.target.value as TaskPriority)}
          className="bg-gray-800 dark:bg-gray-700 text-xs rounded-md px-1.5 py-1 border border-gray-700"
        >
          <option value="">Priority…</option>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>{PRIORITY_META[p].label}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-gray-700" />
      <button onClick={onSomeday} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors">
        <MoonStar className="w-3.5 h-3.5" /> Someday
      </button>
      <button onClick={onArchive} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-600/80 transition-colors">
        <Archive className="w-3.5 h-3.5" /> Archive
      </button>
      <button onClick={onDelete} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-red-600/80 transition-colors">
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors" title="Clear selection">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
