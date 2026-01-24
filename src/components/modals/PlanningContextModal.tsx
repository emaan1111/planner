'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlannerStore } from '@/store/plannerStore';
import { PlanningContext } from '@/types';
import { X, Plus, Trash2, Target, Lightbulb, AlertTriangle, Settings, FileText, Check } from 'lucide-react';
import clsx from 'clsx';

const contextTypes: Array<{ value: PlanningContext['type']; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { value: 'constraint', label: 'Constraint', icon: AlertTriangle, description: 'Rules that must be followed' },
  { value: 'assumption', label: 'Assumption', icon: Lightbulb, description: 'Things AI should assume' },
  { value: 'goal', label: 'Goal', icon: Target, description: 'Objectives to achieve' },
  { value: 'preference', label: 'Preference', icon: Settings, description: 'Preferred ways of working' },
  { value: 'note', label: 'Note', icon: FileText, description: 'General information for AI' },
];

export function PlanningContextModal() {
  const {
    isPlanningContextModalOpen,
    closePlanningContextModal,
    planningContext,
    addPlanningContext,
    updatePlanningContext,
    deletePlanningContext,
    togglePlanningContext,
    constraints,
    addConstraint,
    deleteConstraint,
    toggleConstraint,
  } = usePlannerStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newContext, setNewContext] = useState<{
    type: PlanningContext['type'];
    title: string;
    description: string;
  }>({
    type: 'constraint',
    title: '',
    description: '',
  });

  const [activeTab, setActiveTab] = useState<'context' | 'constraints'>('context');

  const handleAdd = () => {
    if (newContext.title.trim() && newContext.description.trim()) {
      addPlanningContext({
        type: newContext.type,
        title: newContext.title.trim(),
        description: newContext.description.trim(),
        isActive: true,
      });
      setNewContext({ type: 'constraint', title: '', description: '' });
      setIsAdding(false);
    }
  };

  const handleAddConstraint = () => {
    const name = prompt('Enter constraint name:');
    const description = prompt('Enter constraint description:');
    if (name && description) {
      addConstraint({
        name,
        description,
        type: 'custom',
        rule: { type: 'custom', params: {} },
        isActive: true,
      });
    }
  };

  if (!isPlanningContextModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={closePlanningContextModal}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  AI Planning Context
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Define constraints, assumptions, and goals for AI assistance
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={closePlanningContextModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-500" />
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTab('context')}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === 'context'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                AI Context
              </button>
              <button
                onClick={() => setActiveTab('constraints')}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === 'constraints'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                Scheduling Constraints
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'context' && (
              <div className="space-y-4">
                {/* Add new context button */}
                {!isAdding && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsAdding(true)}
                    className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Context for AI
                  </motion.button>
                )}

                {/* Add form */}
                <AnimatePresence>
                  {isAdding && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {contextTypes.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            onClick={() => setNewContext({ ...newContext, type: value })}
                            className={clsx(
                              'p-3 rounded-lg flex flex-col items-center gap-1 transition-all',
                              newContext.type === value
                                ? 'bg-blue-500 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{label}</span>
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Title (e.g., 'No meetings on Fridays')"
                        value={newContext.title}
                        onChange={(e) => setNewContext({ ...newContext, title: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />

                      <textarea
                        placeholder="Description (explain to AI what this means and how to apply it)"
                        value={newContext.description}
                        onChange={(e) => setNewContext({ ...newContext, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />

                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setIsAdding(false)}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAdd}
                          disabled={!newContext.title.trim() || !newContext.description.trim()}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Add Context
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Existing contexts */}
                {planningContext.length === 0 && !isAdding && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No AI context defined yet.</p>
                    <p className="text-sm">Add constraints, assumptions, or goals for better AI assistance.</p>
                  </div>
                )}

                {planningContext.map((ctx) => {
                  const typeConfig = contextTypes.find((t) => t.value === ctx.type);
                  const Icon = typeConfig?.icon || FileText;

                  return (
                    <motion.div
                      key={ctx.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx(
                        'p-4 rounded-xl border transition-all',
                        ctx.isActive
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          'p-2 rounded-lg',
                          ctx.isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'
                        )}>
                          <Icon className={clsx(
                            'w-5 h-5',
                            ctx.isActive ? 'text-blue-500' : 'text-gray-400'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {ctx.title}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                              {typeConfig?.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {ctx.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => togglePlanningContext(ctx.id)}
                            className={clsx(
                              'w-10 h-6 rounded-full p-1 transition-colors',
                              ctx.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            )}
                          >
                            <motion.div
                              animate={{ x: ctx.isActive ? 16 : 0 }}
                              className="w-4 h-4 bg-white rounded-full shadow-md"
                            />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => deletePlanningContext(ctx.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {activeTab === 'constraints' && (
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddConstraint}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Scheduling Constraint
                </motion.button>

                {constraints.map((constraint) => (
                  <motion.div
                    key={constraint.id}
                    layout
                    className={clsx(
                      'p-4 rounded-xl border transition-all',
                      constraint.isActive
                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'p-2 rounded-lg',
                        constraint.isActive ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gray-100 dark:bg-gray-700'
                      )}>
                        <AlertTriangle className={clsx(
                          'w-5 h-5',
                          constraint.isActive ? 'text-amber-500' : 'text-gray-400'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {constraint.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {constraint.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleConstraint(constraint.id)}
                          className={clsx(
                            'w-10 h-6 rounded-full p-1 transition-colors',
                            constraint.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <motion.div
                            animate={{ x: constraint.isActive ? 16 : 0 }}
                            className="w-4 h-4 bg-white rounded-full shadow-md"
                          />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteConstraint(constraint.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
