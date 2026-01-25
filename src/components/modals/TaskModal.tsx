'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasksQuery';
import { useEvents } from '@/hooks/useEventsQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { useProjects } from '@/hooks/useProjectsQuery';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { X, CheckSquare, Trash2, Calendar, Tag, Flag, Clock, Layout, PlayCircle, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { toast } from '@/components/ui/Toast';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTask?: Task | null;
}

export function TaskModal({ isOpen, onClose, selectedTask }: TaskModalProps) {
  const { data: events = [] } = useEvents();
  const { data: planTypes = [] } = usePlanTypes();
  const { data: projects = [] } = useProjects();
  
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: '',
    linkedPlanType: '',
    linkedEventId: '',
    projectId: '',
  });

  useEffect(() => {
    if (selectedTask) {
      setFormData({
        title: selectedTask.title,
        description: selectedTask.description || '',
        status: selectedTask.status,
        priority: selectedTask.priority,
        dueDate: selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'yyyy-MM-dd') : '',
        linkedPlanType: selectedTask.linkedPlanType || '',
        linkedEventId: selectedTask.linkedEventId || '',
        projectId: selectedTask.projectId || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        linkedPlanType: '',
        linkedEventId: '',
        projectId: '',
      });
    }
  }, [selectedTask, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      title: formData.title,
      description: formData.description || undefined,
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      linkedPlanType: formData.linkedPlanType || undefined,
      linkedEventId: formData.linkedEventId || undefined,
      projectId: formData.projectId || undefined,
    };

    if (selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, updates: taskData });
      toast.success(`Updated "${formData.title}"`);
    } else {
      createTaskMutation.mutate(taskData);
      toast.success(`Created "${formData.title}"`);
    }
    onClose();
  };

  const handleDelete = () => {
    if (selectedTask) {
      deleteTaskMutation.mutate(selectedTask.id);
      toast.success(`Deleted "${selectedTask.title}"`);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl glass-modal rounded-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {selectedTask ? 'Edit Task' : 'New Task'}
              </h2>
              <div className="flex items-center gap-2">
                {selectedTask && (
                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Task title"
                    required
                    className="w-full text-lg font-semibold bg-transparent border-b-2 border-gray-200 dark:border-gray-800 focus:border-blue-500 rounded-none px-0 py-2 focus:outline-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-600 dark:text-white"
                  />
                </div>

                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Status</label>
                    <div className="space-y-2">
                      {(['todo', 'in-progress', 'scheduled', 'done'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFormData({ ...formData, status })}
                          className={clsx(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border',
                            formData.status === status
                              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                              : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {status === 'done' ? <CheckCircle2 className="w-4 h-4" /> :
                           status === 'in-progress' ? <PlayCircle className="w-4 h-4" /> :
                           <Circle className="w-4 h-4" />}
                          <span className="capitalize">{status.replace('-', ' ')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Priority</label>
                    <div className="space-y-2">
                      {(['low', 'medium', 'high'] as const).map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => setFormData({ ...formData, priority })}
                          className={clsx(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border',
                            formData.priority === priority
                              ? priority === 'high' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' :
                                priority === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' :
                                'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                              : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                          )}
                        >
                          <Flag className={clsx('w-4 h-4', 
                            priority === 'high' ? 'fill-current' : 
                            priority === 'medium' ? 'fill-current opacity-50' : '')} 
                          />
                          <span className="capitalize">{priority}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Clock className="w-4 h-4" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Associations */}
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Tag className="w-4 h-4" />
                      Plan Type
                    </label>
                    <select
                      value={formData.linkedPlanType}
                      onChange={(e) => setFormData({ ...formData, linkedPlanType: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {planTypes.map(pt => (
                        <option key={pt.id} value={pt.name}>{pt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Layout className="w-4 h-4" />
                      Project
                    </label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Linked Event */}
                 <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4" />
                      Linked Event
                    </label>
                    <select
                      value={formData.linkedEventId}
                      onChange={(e) => setFormData({ ...formData, linkedEventId: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {events.map(e => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                      ))}
                    </select>
                  </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Add details..."
                  />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="task-form"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow font-medium"
              >
                {selectedTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
