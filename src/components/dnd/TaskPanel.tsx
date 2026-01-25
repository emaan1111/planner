'use client';

import { useDraggable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasksQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { Task } from '@/types';
import { GripVertical, X, CheckSquare, Circle, Check, Plus, Trash2, Pencil, Filter, GripHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '@/store/uiStore';
import { useState, useRef, useCallback, useEffect } from 'react';

interface DraggableTaskProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function DraggableTask({ task, onEdit, onDelete }: DraggableTaskProps) {
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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={clsx(
        'flex items-center gap-2 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all border-l-4 group',
        getPriorityColor(task.priority),
        isDragging && 'opacity-50 shadow-lg scale-105',
        'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      )}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
      <span className="flex-shrink-0">{getTaskStatusIcon(task.status)}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
        {task.title}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          title="Edit task"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          title="Delete task"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

interface TaskFormData {
  title: string;
  priority: 'low' | 'medium' | 'high';
  linkedPlanType: string;
}

export function TaskPanel() {
  const { isTaskPanelOpen, toggleTaskPanel } = useUIStore();
  const { data: tasks = [] } = useTasks();
  const { data: planTypes = [] } = usePlanTypes();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterPlanType, setFilterPlanType] = useState<string>('all');
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    priority: 'medium',
    linkedPlanType: '',
  });

  // Resize state
  const [panelSize, setPanelSize] = useState({ width: 320, height: 450 });
  const [isResizing, setIsResizing] = useState<'width' | 'height' | 'both' | null>(null);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 320, height: 450 });

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'width' | 'height' | 'both') => {
    e.preventDefault();
    setIsResizing(direction);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: panelSize.width,
      height: panelSize.height,
    };
  }, [panelSize]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = resizeStartRef.current.x - e.clientX;
      const deltaY = e.clientY - resizeStartRef.current.y;

      setPanelSize(prev => ({
        width: isResizing === 'height' ? prev.width : Math.max(280, Math.min(600, resizeStartRef.current.width + deltaX)),
        height: isResizing === 'width' ? prev.height : Math.max(300, Math.min(800, resizeStartRef.current.height + deltaY)),
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const draggableTasks = tasks.filter(t => {
    // Filter out done and scheduled tasks
    if (t.status === 'done' || t.status === 'scheduled') return false;
    // Apply plan type filter
    if (filterPlanType === 'all') return true;
    if (filterPlanType === 'none') return !t.linkedPlanType;
    return t.linkedPlanType === filterPlanType;
  });

  const resetForm = () => {
    setFormData({ title: '', priority: 'medium', linkedPlanType: '' });
    setEditingTask(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) return;

    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask.id,
        updates: {
          title: formData.title.trim(),
          priority: formData.priority,
          linkedPlanType: formData.linkedPlanType || undefined,
        },
      });
    } else {
      createTaskMutation.mutate({
        title: formData.title.trim(),
        status: 'todo',
        priority: formData.priority,
        linkedPlanType: formData.linkedPlanType || undefined,
      });
    }
    resetForm();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      priority: task.priority,
      linkedPlanType: task.linkedPlanType || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteTaskMutation.mutate(id);
  };

  return (
    <AnimatePresence>
      {isTaskPanelOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ width: panelSize.width, height: panelSize.height }}
          className={clsx(
            "fixed right-4 top-20 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 z-40 overflow-hidden flex flex-col",
            isResizing && "select-none"
          )}
        >
          {/* Resize handle - left edge */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'width')}
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/20 transition-colors z-10"
          />
          
          {/* Resize handle - bottom edge */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'height')}
            className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize hover:bg-blue-500/20 transition-colors z-10"
          />
          
          {/* Resize handle - corner */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'both')}
            className="absolute left-0 bottom-0 w-4 h-4 cursor-nesw-resize hover:bg-blue-500/30 transition-colors z-20 flex items-center justify-center"
          >
            <GripHorizontal className="w-3 h-3 text-gray-400 rotate-45" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 flex-shrink-0">
            <div className="flex items-center gap-2 text-white">
              <CheckSquare className="w-5 h-5" />
              <span className="font-semibold">Tasks</span>
              {draggableTasks.length > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {draggableTasks.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Add new task"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={toggleTaskPanel}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Add/Edit Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                  <input
                    type="text"
                    placeholder="Task title..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit();
                      if (e.key === 'Escape') resetForm();
                    }}
                  />
                  <div className="flex gap-2">
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <select
                      value={formData.linkedPlanType}
                      onChange={(e) => setFormData({ ...formData, linkedPlanType: e.target.value })}
                      className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                      <option value="">No plan type</option>
                      {planTypes.map((pt) => (
                        <option key={pt.id} value={pt.name}>{pt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetForm}
                      className="flex-1 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!formData.title.trim()}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {editingTask ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter & Instructions */}
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterPlanType}
                onChange={(e) => setFilterPlanType(e.target.value)}
                className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="all">All Plan Types</option>
                <option value="none">No Plan Type</option>
                {planTypes.map((pt) => (
                  <option key={pt.id} value={pt.name}>{pt.label}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Drag tasks to calendar to schedule them
            </p>
          </div>

          {/* Task list */}
          <div className="p-3 flex-1 overflow-y-auto space-y-2">
            {draggableTasks.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks to schedule</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-600"
                >
                  Add a task
                </button>
              </div>
            ) : (
              draggableTasks.map(task => (
                <DraggableTask 
                  key={task.id} 
                  task={task} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
