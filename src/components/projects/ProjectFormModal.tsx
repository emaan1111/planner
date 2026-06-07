'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { FolderPlus, Check } from 'lucide-react';
import { Project, EventColor, colorClasses } from '@/types';

interface ProjectFormModalProps {
  project?: Project | null;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string; color: EventColor }) => void;
  onUpdate: (id: string, updates: Partial<Project>) => void;
}

// A curated palette for projects (subset of the full colorClasses set).
const PALETTE: EventColor[] = [
  'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red',
  'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'slate', 'gray', 'stone',
];

export function ProjectFormModal({ project, onClose, onCreate, onUpdate }: ProjectFormModalProps) {
  const isEdit = !!project;
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState<EventColor>(project?.color ?? 'blue');

  const submit = () => {
    if (!name.trim()) return;
    if (isEdit && project) {
      onUpdate(project.id, { name: name.trim(), description: description.trim() || undefined, color });
    } else {
      onCreate({ name: name.trim(), description: description.trim() || undefined, color });
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', colorClasses[color].bg)}>
            <FolderPlus className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Project' : 'New Project'}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="grid grid-cols-10 gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110',
                    colorClasses[c].bg,
                    color === c && 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900'
                  )}
                  title={c}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className={clsx('flex-1 px-4 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 transition-opacity', colorClasses[color].bg, colorClasses[color].hover)}
          >
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
