'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useDecisions, useCreateDecision, useUpdateDecision, useDeleteDecision } from '@/hooks/useDecisionsQuery';
import { useEvents } from '@/hooks/useEventsQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { KeyDecision } from '@/types';
import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { 
  ArrowLeft, 
  Plus, 
  Lightbulb, 
  Trash2, 
  Calendar,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Filter,
  Search
} from 'lucide-react';

export default function DecisionsPage() {
  const { data: decisions = [] } = useDecisions();
  const { data: events = [] } = useEvents();
  const { data: planTypes = [] } = usePlanTypes();
  
  const createDecisionMutation = useCreateDecision();
  const updateDecisionMutation = useUpdateDecision();
  const deleteDecisionMutation = useDeleteDecision();
  
  const addDecision = (decision: Omit<KeyDecision, 'id' | 'createdAt' | 'updatedAt'>) => {
    createDecisionMutation.mutate(decision);
  };
  
  const updateDecision = (id: string, updates: Partial<KeyDecision>) => {
    updateDecisionMutation.mutate({ id, updates });
  };
  
  const deleteDecision = (id: string) => {
    deleteDecisionMutation.mutate(id);
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPlanType, setNewPlanType] = useState('');
  const [newEventId, setNewEventId] = useState('');
  const [filterStatus, setFilterStatus] = useState<KeyDecision['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOutcome, setEditOutcome] = useState('');

  const allPlanTypes = planTypes.map(pt => pt.name);

  const handleAddDecision = () => {
    if (newTitle.trim()) {
      addDecision({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        status: 'pending',
        linkedPlanType: newPlanType || undefined,
        linkedEventId: newEventId || undefined,
      });
      setNewTitle('');
      setNewDescription('');
      setNewPlanType('');
      setNewEventId('');
      setShowAddForm(false);
    }
  };

  const handleSaveOutcome = (id: string) => {
    updateDecision(id, { 
      outcome: editOutcome,
      status: 'decided',
      decidedAt: new Date()
    });
    setEditingId(null);
    setEditOutcome('');
  };

  const filteredDecisions = decisions.filter(d => {
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: KeyDecision['status']) => {
    switch (status) {
      case 'decided':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'deferred':
        return <PauseCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: KeyDecision['status']) => {
    switch (status) {
      case 'decided':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'deferred':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  const getLinkedEvent = (eventId: string) => {
    return events.find(e => e.id === eventId);
  };

  const stats = {
    total: decisions.length,
    pending: decisions.filter(d => d.status === 'pending').length,
    decided: decisions.filter(d => d.status === 'decided').length,
    deferred: decisions.filter(d => d.status === 'deferred').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Key Decisions</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Track important decisions for your plans</p>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-shadow"
            >
              <Plus className="w-5 h-5" />
              New Decision
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800"
          >
            <p className="text-sm text-blue-600 dark:text-blue-400">Pending</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.pending}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800"
          >
            <p className="text-sm text-green-600 dark:text-green-400">Decided</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.decided}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800"
          >
            <p className="text-sm text-amber-600 dark:text-amber-400">Deferred</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.deferred}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as KeyDecision['status'] | 'all')}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="decided">Decided</option>
              <option value="deferred">Deferred</option>
            </select>
          </div>
        </div>

        {/* Decisions List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredDecisions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Lightbulb className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No decisions found</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
                >
                  Add your first decision
                </button>
              </motion.div>
            ) : (
              filteredDecisions.map((decision, index) => {
                const linkedEvent = decision.linkedEventId ? getLinkedEvent(decision.linkedEventId) : null;
                
                return (
                  <motion.div
                    key={decision.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className={clsx(
                      'bg-white dark:bg-gray-900 rounded-xl p-5 border transition-all hover:shadow-lg',
                      getStatusColor(decision.status)
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getStatusIcon(decision.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {decision.title}
                            </h3>
                            {decision.description && (
                              <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {decision.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={decision.status}
                              onChange={(e) => updateDecision(decision.id, { 
                                status: e.target.value as KeyDecision['status'],
                                decidedAt: e.target.value === 'decided' ? new Date() : undefined
                              })}
                              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                            >
                              <option value="pending">Pending</option>
                              <option value="decided">Decided</option>
                              <option value="deferred">Deferred</option>
                            </select>
                            <button
                              onClick={() => deleteDecision(decision.id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Links */}
                        <div className="flex items-center gap-4 mt-3">
                          {decision.linkedPlanType && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <Tag className="w-4 h-4" />
                              <span>{decision.linkedPlanType}</span>
                            </div>
                          )}
                          {linkedEvent && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span>{linkedEvent.title}</span>
                            </div>
                          )}
                          {decision.decidedAt && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              <span>Decided {new Date(decision.decidedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Outcome section for decided items */}
                        {decision.status === 'decided' && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            {editingId === decision.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editOutcome}
                                  onChange={(e) => setEditOutcome(e.target.value)}
                                  placeholder="What was the outcome/decision?"
                                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveOutcome(decision.id)}
                                    className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                                  >
                                    Save Outcome
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {decision.outcome ? (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outcome:</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{decision.outcome}</p>
                                    <button
                                      onClick={() => {
                                        setEditingId(decision.id);
                                        setEditOutcome(decision.outcome || '');
                                      }}
                                      className="mt-2 text-sm text-amber-600 hover:text-amber-700"
                                    >
                                      Edit outcome
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingId(decision.id);
                                      setEditOutcome('');
                                    }}
                                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                  >
                                    + Add outcome details
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Decision Modal */}
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Decision</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Decision Title *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="What decision needs to be made?"
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
                    placeholder="Additional context or options to consider..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Link to Plan Type
                    </label>
                    <select
                      value={newPlanType}
                      onChange={(e) => setNewPlanType(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">None</option>
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
                  onClick={handleAddDecision}
                  disabled={!newTitle.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium disabled:opacity-50 transition-opacity"
                >
                  Add Decision
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
