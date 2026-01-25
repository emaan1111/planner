'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useEvents } from '@/hooks/useEventsQuery';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasksQuery';
import { useDecisions, useCreateDecision, useUpdateDecision, useDeleteDecision } from '@/hooks/useDecisionsQuery';
import { usePlanTypes, useCreatePlanType, useDeletePlanType } from '@/hooks/usePlanTypesQuery';
import { PlanType, colorClasses, EventColor, Task, KeyDecision } from '@/types';
import { Plus, Filter, ChevronDown, Star, Trash2, Brain, Lightbulb, CheckSquare, Check, Circle, ExternalLink, List, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const colors: EventColor[] = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

export function Sidebar() {
  const {
    isSidebarOpen,
    selectedPlanTypes,
    togglePlanType,
    syncPlanTypes,
    openEventModal,
    openPlanningContextModal,
    toggleTaskPanel,
    isTaskPanelOpen,
  } = useUIStore();

  const { data: planTypes = [] } = usePlanTypes();
  const { data: events = [] } = useEvents();
  const { data: tasks = [] } = useTasks();
  const { data: decisions = [] } = useDecisions();
  
  // Sync plan types to filter when they change
  useEffect(() => {
    if (planTypes.length > 0) {
      syncPlanTypes(planTypes.map(pt => pt.name));
    }
  }, [planTypes, syncPlanTypes]);
  
  const createPlanTypeMutation = useCreatePlanType();
  const deletePlanTypeMutation = useDeletePlanType();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const createDecisionMutation = useCreateDecision();
  const updateDecisionMutation = useUpdateDecision();
  const deleteDecisionMutation = useDeleteDecision();
  
  const addPlanType = (pt: { name: string; label: string; color: EventColor; icon: string }) => {
    createPlanTypeMutation.mutate(pt);
  };
  
  const deletePlanType = (id: string) => {
    deletePlanTypeMutation.mutate(id);
  };
  
  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    createTaskMutation.mutate(task);
  };
  
  const updateTask = (id: string, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ id, updates });
  };
  
  const deleteTask = (id: string) => {
    deleteTaskMutation.mutate(id);
  };
  
  const addDecision = (decision: Omit<KeyDecision, 'id' | 'createdAt' | 'updatedAt'>) => {
    createDecisionMutation.mutate(decision);
  };
  
  const updateDecision = (id: string, updates: Partial<KeyDecision>) => {
    updateDecisionMutation.mutate({ id, updates });
  };
  
  const deleteDecision = (id: string) => {
    deleteDecisionMutation.mutate(id);
  };

  const [showFilters, setShowFilters] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showDecisions, setShowDecisions] = useState(true);
  const [showAddPlanType, setShowAddPlanType] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddDecision, setShowAddDecision] = useState(false);
  const [newPlanTypeName, setNewPlanTypeName] = useState('');
  const [newPlanTypeColor, setNewPlanTypeColor] = useState<EventColor>('blue');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPlanType, setNewTaskPlanType] = useState<PlanType | ''>('');
  const [newTaskEventId, setNewTaskEventId] = useState<string>('');
  const [newDecisionTitle, setNewDecisionTitle] = useState('');
  const [newDecisionPlanType, setNewDecisionPlanType] = useState<PlanType | ''>('');
  const [newDecisionEventId, setNewDecisionEventId] = useState<string>('');

  const handleAddPlanType = () => {
    if (newPlanTypeName.trim()) {
      addPlanType({
        name: newPlanTypeName.toLowerCase().replace(/\s+/g, '-'),
        label: newPlanTypeName.trim(),
        color: newPlanTypeColor,
        icon: 'Star',
      });
      setNewPlanTypeName('');
      setShowAddPlanType(false);
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask({
        title: newTaskTitle.trim(),
        status: 'todo',
        priority: 'medium',
        linkedPlanType: newTaskPlanType || undefined,
        linkedEventId: newTaskEventId || undefined,
      });
      setNewTaskTitle('');
      setNewTaskPlanType('');
      setNewTaskEventId('');
      setShowAddTask(false);
    }
  };

  const handleAddDecision = () => {
    if (newDecisionTitle.trim()) {
      addDecision({
        title: newDecisionTitle.trim(),
        status: 'pending',
        linkedPlanType: newDecisionPlanType || undefined,
        linkedEventId: newDecisionEventId || undefined,
      });
      setNewDecisionTitle('');
      setNewDecisionPlanType('');
      setNewDecisionEventId('');
      setShowAddDecision(false);
    }
  };

  const getTaskStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Circle className="w-4 h-4 text-blue-500 fill-blue-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDecisionStatusColor = (status: KeyDecision['status']) => {
    switch (status) {
      case 'decided':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'deferred':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isSidebarOpen && (
        <motion.aside
          initial={{ opacity: 0, x: -300, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 320 }}
          exit={{ opacity: 0, x: -300, width: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="glass-sidebar border-r border-gray-200/50 dark:border-gray-800/50 h-full overflow-hidden flex flex-col"
        >
          <div className="p-4 flex-1 overflow-y-auto">
            {/* Create button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openEventModal()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </motion.button>

            {/* View All Events Link */}
            <Link
              href="/events"
              className="mt-2 w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <List className="w-3.5 h-3.5" />
              <span>All Events</span>
              <span className="ml-auto text-xs text-gray-400">{events.length}</span>
            </Link>

            {/* Plan Type Filters */}
            <div className="mt-6">
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-between w-full text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Plan Types
                </div>
                <motion.div animate={{ rotate: showFilters ? 180 : 0 }}>
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {/* All plan types */}
                    {planTypes.map((planType) => {
                      const isSelected = selectedPlanTypes.includes(planType.name);
                      const typeColors = colorClasses[planType.color];

                      return (
                        <motion.div
                          key={planType.id}
                          className="flex items-center group"
                        >
                          <motion.button
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => togglePlanType(planType.name)}
                            className={clsx(
                              'flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                              isSelected
                                ? `${typeColors.light} dark:bg-opacity-20`
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                          >
                            <div
                              className={clsx(
                                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                                isSelected ? typeColors.bg : 'bg-gray-200 dark:bg-gray-700'
                              )}
                            >
                              <Star className={clsx('w-4 h-4', isSelected ? 'text-white' : 'text-gray-500')} />
                            </div>
                            <span
                              className={clsx(
                                'text-sm font-medium',
                                isSelected ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'
                              )}
                            >
                              {planType.label}
                            </span>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto"
                              >
                                <Check className="w-4 h-4 text-green-500" />
                              </motion.div>
                            )}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlanType(planType.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Delete plan type"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </motion.div>
                      );
                    })}

                    {/* Add new plan type */}
                    {!showAddPlanType ? (
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => setShowAddPlanType(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">Add Plan Type</span>
                      </motion.button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
                      >
                        <input
                          type="text"
                          placeholder="Plan type name..."
                          value={newPlanTypeName}
                          onChange={(e) => setNewPlanTypeName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-1">
                          {colors.slice(0, 10).map((color) => (
                            <button
                              key={color}
                              onClick={() => setNewPlanTypeColor(color)}
                              className={clsx(
                                'w-6 h-6 rounded-full transition-all',
                                colorClasses[color].bg,
                                newPlanTypeColor === color && 'ring-2 ring-offset-2 ring-gray-400'
                              )}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowAddPlanType(false)}
                            className="flex-1 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddPlanType}
                            disabled={!newPlanTypeName.trim()}
                            className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* AI Planning Context */}
            <div className="mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openPlanningContextModal}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-200 dark:border-purple-800 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block">
                    AI Planning Context
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Constraints &amp; assumptions
                  </span>
                </div>
              </motion.button>
            </div>

            {/* Key Decisions */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <motion.button
                  onClick={() => setShowDecisions(!showDecisions)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400"
                >
                  <Lightbulb className="w-4 h-4" />
                  Key Decisions
                  {decisions.filter(d => d.status === 'pending').length > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs rounded-full font-medium">
                      {decisions.filter(d => d.status === 'pending').length}
                    </span>
                  )}
                  <motion.div animate={{ rotate: showDecisions ? 180 : 0 }}>
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </motion.button>
                <Link
                  href="/decisions"
                  className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                  title="Open full decisions page"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              <AnimatePresence>
                {showDecisions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {decisions.slice(0, 5).map((decision) => (
                      <motion.div
                        key={decision.id}
                        whileHover={{ x: 4 }}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {decision.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={clsx('text-xs px-2 py-0.5 rounded-full', getDecisionStatusColor(decision.status))}>
                                {decision.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <select
                              value={decision.status}
                              onChange={(e) => updateDecision(decision.id, { 
                                status: e.target.value as KeyDecision['status'],
                                decidedAt: e.target.value === 'decided' ? new Date() : undefined
                              })}
                              className="text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                            >
                              <option value="pending">Pending</option>
                              <option value="decided">Decided</option>
                              <option value="deferred">Deferred</option>
                            </select>
                            <button
                              onClick={() => deleteDecision(decision.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Add new decision */}
                    {!showAddDecision ? (
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => setShowAddDecision(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Plus className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium">Add Decision</span>
                      </motion.button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
                      >
                        <input
                          type="text"
                          placeholder="Decision to make..."
                          value={newDecisionTitle}
                          onChange={(e) => setNewDecisionTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <select
                            value={newDecisionPlanType}
                            onChange={(e) => setNewDecisionPlanType(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          >
                            <option value="">Link to plan type...</option>
                            {planTypes.map((pt) => (
                              <option key={pt.id} value={pt.name}>{pt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={newDecisionEventId}
                            onChange={(e) => setNewDecisionEventId(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          >
                            <option value="">Link to event...</option>
                            {events.map((event) => (
                              <option key={event.id} value={event.id}>{event.title}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowAddDecision(false)}
                            className="flex-1 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddDecision}
                            disabled={!newDecisionTitle.trim()}
                            className="flex-1 px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tasks */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <motion.button
                  onClick={() => setShowTasks(!showTasks)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400"
                >
                  <CheckSquare className="w-4 h-4" />
                  Tasks
                  {tasks.filter(t => t.status !== 'done').length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full font-medium">
                      {tasks.filter(t => t.status !== 'done').length}
                    </span>
                  )}
                  <motion.div animate={{ rotate: showTasks ? 180 : 0 }}>
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </motion.button>
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleTaskPanel}
                    className={clsx(
                      'p-1.5 rounded-lg transition-colors',
                      isTaskPanelOpen
                        ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    )}
                    title="Drag tasks to calendar"
                  >
                    <GripVertical className="w-4 h-4" />
                  </motion.button>
                  <Link
                    href="/tasks"
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Open full tasks page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <AnimatePresence>
                {showTasks && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {tasks.slice(0, 5).map((task) => (
                      <motion.div
                        key={task.id}
                        whileHover={{ x: 4 }}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <button
                              onClick={() => {
                                const nextStatus: Record<Task['status'], Task['status']> = {
                                  'todo': 'in-progress',
                                  'in-progress': 'done',
                                  'done': 'todo',
                                };
                                updateTask(task.id, { status: nextStatus[task.status] });
                              }}
                              className="mt-0.5"
                            >
                              {getTaskStatusIcon(task.status)}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={clsx(
                                'text-sm font-medium truncate',
                                task.status === 'done' 
                                  ? 'text-gray-400 dark:text-gray-500 line-through' 
                                  : 'text-gray-800 dark:text-gray-200'
                              )}>
                                {task.title}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {/* Add new task */}
                    {!showAddTask ? (
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => setShowAddTask(true)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Plus className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium">Add Task</span>
                      </motion.button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
                      >
                        <input
                          type="text"
                          placeholder="Task title..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <select
                            value={newTaskPlanType}
                            onChange={(e) => setNewTaskPlanType(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          >
                            <option value="">Link to plan type...</option>
                            {planTypes.map((pt) => (
                              <option key={pt.id} value={pt.name}>{pt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={newTaskEventId}
                            onChange={(e) => setNewTaskEventId(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          >
                            <option value="">Link to event...</option>
                            {events.map((event) => (
                              <option key={event.id} value={event.id}>{event.title}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowAddTask(false)}
                            className="flex-1 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddTask}
                            disabled={!newTaskTitle.trim()}
                            className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
