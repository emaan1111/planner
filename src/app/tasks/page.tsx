'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useReorderTasks } from '@/hooks/useTasksQuery';
import { useEvents } from '@/hooks/useEventsQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { Task } from '@/types';
import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ArrowLeft, 
  Plus, 
  CheckSquare, 
  Trash2, 
  Calendar,
  Tag,
  Clock,
  Circle,
  CheckCircle2,
  PlayCircle,
  Filter,
  Search,
  GripVertical
} from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

// Helper functions for task display
const getStatusIcon = (status: Task['status']) => {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'scheduled':
      return <Circle className="w-4 h-4 text-purple-500 fill-purple-500" />;
    case 'in-progress':
      return <PlayCircle className="w-4 h-4 text-blue-500" />;
    default:
      return <Circle className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusColor = (status: Task['status']) => {
  switch (status) {
    case 'done':
      return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
    case 'scheduled':
      return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800';
    case 'in-progress':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    default:
      return 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700';
  }
};

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }
};

interface SortableTaskCardProps {
  task: Task;
  linkedEvent: { title: string } | null;
  onCycleStatus: () => void;
  onUpdateStatus: (status: Task['status']) => void;
  onDelete: () => void;
  isDragOverlay?: boolean;
}

function SortableTaskCard({ task, linkedEvent, onCycleStatus, onUpdateStatus, onDelete, isDragOverlay }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'rounded-lg p-3 border transition-all hover:shadow-sm',
        getStatusColor(task.status),
        task.status === 'done' && 'opacity-60',
        isDragging && !isDragOverlay && 'opacity-30',
        isDragOverlay && 'shadow-2xl scale-105'
      )}
    >
      <div className="flex items-start gap-3">
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing touch-none mt-0.5 flex-shrink-0">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <button
          onClick={onCycleStatus}
          className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
          title={`Click to change status (current: ${task.status})`}
        >
          {getStatusIcon(task.status)}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={clsx(
                'text-base font-semibold',
                task.status === 'done'
                  ? 'text-gray-500 dark:text-gray-400 line-through'
                  : 'text-gray-900 dark:text-white'
              )}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {task.description}
                </p>
              )}
            </div>
            {!isDragOverlay && (
              <div className="flex items-center gap-2">
                <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', getPriorityColor(task.priority))}>
                  {task.priority}
                </span>
                <select
                  value={task.status}
                  onChange={(e) => onUpdateStatus(e.target.value as Task['status'])}
                  className="text-sm px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="done">Done</option>
                </select>
                <button
                  onClick={onDelete}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Links & metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
            {task.linkedPlanType && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Tag className="w-4 h-4" />
                <span>{task.linkedPlanType}</span>
              </div>
            )}
            {linkedEvent && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{linkedEvent.title}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { data: tasks = [] } = useTasks();
  const { data: events = [] } = useEvents();
  const { data: planTypes = [] } = usePlanTypes();
  
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const reorderMutation = useReorderTasks();
  
  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
    createTaskMutation.mutate(task);
  };
  
  const updateTask = (id: string, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ id, updates });
  };
  
  const deleteTask = (id: string) => {
    deleteTaskMutation.mutate(id);
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
  const [newPlanType, setNewPlanType] = useState('');
  const [newEventId, setNewEventId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [filterPlanType, setFilterPlanType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'custom' | 'status'>('status');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkPlanType, setBulkPlanType] = useState<string>('');
  const [bulkPriority, setBulkPriority] = useState<Task['priority'] | ''>('');
  const [pwaPrompt, setPwaPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  const allPlanTypes = planTypes.map(pt => pt.name);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPwaPrompt(event as BeforeInstallPromptEvent);
      setShowPwaPrompt(true);
    };

    const handleInstalled = () => {
      setShowPwaPrompt(false);
      setPwaPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handlePwaInstall = useCallback(async () => {
    if (!pwaPrompt) return;
    await pwaPrompt.prompt();
    await pwaPrompt.userChoice;
    setShowPwaPrompt(false);
    setPwaPrompt(null);
  }, [pwaPrompt]);

  const handleAddTask = () => {
    if (newTitle.trim()) {
      addTask({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        status: 'todo',
        priority: newPriority,
        dueDate: newDueDate ? new Date(newDueDate) : undefined,
        linkedPlanType: newPlanType || undefined,
        linkedEventId: newEventId || undefined,
      });
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setNewPlanType('');
      setNewEventId('');
      setNewDueDate('');
      setShowAddForm(false);
    }
  };

  const cycleTaskStatus = (task: Task) => {
    const nextStatus: Record<Task['status'], Task['status']> = {
      'todo': 'in-progress',
      'in-progress': 'scheduled',
      'scheduled': 'done',
      'done': 'todo',
    };
    updateTask(task.id, { status: nextStatus[task.status] });
  };

  const filteredTasks = useMemo(() => tasks.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesPlanType = filterPlanType === 'all' || t.linkedPlanType === filterPlanType;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesPlanType && matchesSearch;
  }), [tasks, filterStatus, filterPriority, filterPlanType, searchQuery]);

  // Sort: either by custom order or status-based
  const sortedTasks = useMemo(() => {
    if (sortMode === 'custom') {
      // Use the order field (already sorted from API)
      return filteredTasks;
    }
    // Sort by status, then priority
    return [...filteredTasks].sort((a, b) => {
      const statusOrder: Record<Task['status'], number> = { 'todo': 0, 'in-progress': 1, 'scheduled': 2, 'done': 3 };
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [filteredTasks, sortMode]);

  const taskIds = useMemo(() => sortedTasks.map(t => t.id), [sortedTasks]);
  const selectedCount = selectedTaskIds.size;
  const allVisibleSelected = sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.has(t.id));

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        sortedTasks.forEach(t => next.delete(t.id));
      } else {
        sortedTasks.forEach(t => next.add(t.id));
      }
      return next;
    });
  }, [allVisibleSelected, sortedTasks]);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const applyBulkEdits = useCallback(() => {
    if (selectedTaskIds.size === 0) return;
    selectedTaskIds.forEach((id) => {
      const updates: Partial<Task> = {};
      if (bulkPlanType) updates.linkedPlanType = bulkPlanType;
      if (bulkPriority) updates.priority = bulkPriority;
      if (Object.keys(updates).length > 0) {
        updateTask(id, updates);
      }
    });
    setBulkPlanType('');
    setBulkPriority('');
  }, [selectedTaskIds, bulkPlanType, bulkPriority, updateTask]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = sortedTasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  }, [sortedTasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedTasks.findIndex(t => t.id === active.id);
      const newIndex = sortedTasks.findIndex(t => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTasks = arrayMove(sortedTasks, oldIndex, newIndex);
        const orderedIds = reorderedTasks.map(t => t.id);
        reorderMutation.mutate(orderedIds);
      }
    }
  }, [sortedTasks, reorderMutation]);

  const getLinkedEvent = (eventId: string): { title: string } | null => {
    return events.find(e => e.id === eventId) || null;
  };

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">Tasks</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your tasks and to-dos</p>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-medium shadow shadow-blue-500/25 hover:shadow-md hover:shadow-blue-500/30 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              New Task
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {showPwaPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Install Planner</p>
              <p className="text-xs text-blue-700 dark:text-blue-200">
                Add the app to your home screen for quick access and offline use.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPwaPrompt(false)}
                className="px-3 py-1.5 text-sm text-blue-700 dark:text-blue-200 hover:text-blue-900 dark:hover:text-blue-100"
              >
                Not now
              </button>
              <button
                onClick={handlePwaInstall}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Install
              </button>
            </div>
          </motion.div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">To Do</p>
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{stats.todo}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800"
          >
            <p className="text-xs text-blue-600 dark:text-blue-400">In Progress</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.inProgress}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800"
          >
            <p className="text-xs text-green-600 dark:text-green-400">Done</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">{stats.done}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Task['status'] | 'all')}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="scheduled">Scheduled</option>
              <option value="done">Done</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Task['priority'] | 'all')}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterPlanType}
              onChange={(e) => setFilterPlanType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">All Plan Types</option>
              {planTypes.map((pt) => (
                <option key={pt.id} value={pt.name}>{pt.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortMode(sortMode === 'custom' ? 'status' : 'custom')}
              className={clsx(
                "px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2",
                sortMode === 'custom'
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
              title={sortMode === 'custom' ? "Currently showing custom order (drag to reorder)" : "Currently sorting by status"}
            >
              <GripVertical className="w-4 h-4" />
              {sortMode === 'custom' ? 'Custom' : 'Status'}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-label="Select all visible tasks"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCount > 0 ? `${selectedCount} selected` : 'Select tasks to bulk edit'}
            </span>
            {selectedCount > 0 && (
              <button
                onClick={clearSelection}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkPlanType}
              onChange={(e) => setBulkPlanType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              disabled={selectedCount === 0}
            >
              <option value="">Set plan type...</option>
              {planTypes.map((pt) => (
                <option key={pt.id} value={pt.name}>{pt.label}</option>
              ))}
            </select>
            <select
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value as Task['priority'] | '')}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              disabled={selectedCount === 0}
            >
              <option value="">Set priority...</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={applyBulkEdits}
              disabled={selectedCount === 0 || (!bulkPlanType && !bulkPriority)}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500 text-sm text-white font-medium disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <CheckSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first task
              </button>
            </motion.div>
          ) : sortMode === 'custom' ? (
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sortedTasks.map((task) => {
                    const linkedEvent = task.linkedEventId ? getLinkedEvent(task.linkedEventId) : null;
                    return (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        linkedEvent={linkedEvent}
                        onCycleStatus={() => cycleTaskStatus(task)}
                        onUpdateStatus={(status) => updateTask(task.id, { status })}
                        onDelete={() => deleteTask(task.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeTask ? (
                  <SortableTaskCard
                    task={activeTask}
                    linkedEvent={activeTask.linkedEventId ? getLinkedEvent(activeTask.linkedEventId) : null}
                    onCycleStatus={() => {}}
                    onUpdateStatus={() => {}}
                    onDelete={() => {}}
                    isDragOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <AnimatePresence>
              {sortedTasks.map((task, index) => {
                const linkedEvent = task.linkedEventId ? getLinkedEvent(task.linkedEventId) : null;
                
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.03 }}
                    className={clsx(
                      'rounded-lg p-3 border transition-all hover:shadow-sm',
                      getStatusColor(task.status),
                      task.status === 'done' && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select task ${task.title}`}
                      />
                      <button
                        onClick={() => cycleTaskStatus(task)}
                        className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                        title={`Click to change status (current: ${task.status})`}
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className={clsx(
                              'text-base font-semibold',
                              task.status === 'done'
                                ? 'text-gray-500 dark:text-gray-400 line-through'
                                : 'text-gray-900 dark:text-white'
                            )}>
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', getPriorityColor(task.priority))}>
                              {task.priority}
                            </span>
                            <select
                              value={task.status}
                              onChange={(e) => updateTask(task.id, { status: e.target.value as Task['status'] })}
                              className="text-sm px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="done">Done</option>
                            </select>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Links & metadata */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                          {task.linkedPlanType && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Tag className="w-4 h-4" />
                              <span>{task.linkedPlanType}</span>
                            </div>
                          )}
                          {linkedEvent && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span>{linkedEvent.title}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Task</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Additional details..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Plan Type
                    </label>
                    <select
                      value={newPlanType}
                      onChange={(e) => setNewPlanType(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">No plan type</option>
                      {allPlanTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Link to Event
                    </label>
                    <select
                      value={newEventId}
                      onChange={(e) => setNewEventId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">None</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>{event.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTitle.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 transition-opacity"
                >
                  Add Task
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
