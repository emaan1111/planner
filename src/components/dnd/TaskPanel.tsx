'use client';

import { useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '@/hooks/useTasksQuery';
import { Task } from '@/types';
import { GripVertical, X, CheckSquare, Circle, Check } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '@/store/uiStore';

interface DraggableTaskProps {
  task: Task;
}

function DraggableTask({ task }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getTaskStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return <Check className="w-3.5 h-3.5 text-green-500" />;
      case 'in-progress':
        return <Circle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />;
      case 'scheduled':
        return <Circle className="w-3.5 h-3.5 text-purple-500 fill-purple-500" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-amber-500';
      default:
        return 'border-l-green-500';
    }
  };

  if (task.status === 'done' || task.status === 'scheduled') return null;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={clsx(
        'flex items-center gap-2 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing transition-all border-l-4',
        getPriorityColor(task.priority),
        isDragging && 'opacity-50 shadow-lg scale-105',
        'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      )}
    >
      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="flex-shrink-0">{getTaskStatusIcon(task.status)}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
        {task.title}
      </span>
    </motion.div>
  );
}

export function TaskPanel() {
  const { isTaskPanelOpen, toggleTaskPanel } = useUIStore();
  const { data: tasks = [] } = useTasks();

  const draggableTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'scheduled');

  return (
    <AnimatePresence>
      {isTaskPanelOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-4 top-20 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 z-40 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500">
            <div className="flex items-center gap-2 text-white">
              <CheckSquare className="w-5 h-5" />
              <span className="font-semibold">Tasks</span>
              {draggableTasks.length > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {draggableTasks.length}
                </span>
              )}
            </div>
            <button
              onClick={toggleTaskPanel}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Instructions */}
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Drag tasks to calendar to create events
            </p>
          </div>

          {/* Task list */}
          <div className="p-3 max-h-[400px] overflow-y-auto space-y-2">
            {draggableTasks.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks to schedule</p>
              </div>
            ) : (
              draggableTasks.map(task => (
                <DraggableTask key={task.id} task={task} />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
