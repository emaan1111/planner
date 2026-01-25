'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDecisions, useCreateDecision, useUpdateDecision, useDeleteDecision } from '@/hooks/useDecisionsQuery';
import { useEvents } from '@/hooks/useEventsQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { useProjects } from '@/hooks/useProjectsQuery';
import { KeyDecision } from '@/types';
import { X, CheckSquare, Trash2, Calendar, Tag, Flag, Clock, Layout, HelpCircle, CheckCircle2, Clock as ClockIcon, RotateCcw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { toast } from '@/components/ui/Toast';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDecision?: KeyDecision | null;
}

export function DecisionModal({ isOpen, onClose, selectedDecision }: DecisionModalProps) {
  const { data: events = [] } = useEvents();
  const { data: planTypes = [] } = usePlanTypes();
  const { data: projects = [] } = useProjects();
  
  const createDecisionMutation = useCreateDecision();
  const updateDecisionMutation = useUpdateDecision();
  const deleteDecisionMutation = useDeleteDecision();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as KeyDecision['status'],
    outcome: '',
    notes: '',
    linkedPlanType: '',
    linkedEventId: '',
    projectId: '',
  });

  useEffect(() => {
    if (selectedDecision) {
      setFormData({
        title: selectedDecision.title,
        description: selectedDecision.description || '',
        status: selectedDecision.status,
        outcome: selectedDecision.outcome || '',
        notes: (selectedDecision as any).notes || '', // Check type if notes missing in KeyDecision interface yet
        linkedPlanType: selectedDecision.linkedPlanType || '',
        linkedEventId: selectedDecision.linkedEventId || '',
        projectId: selectedDecision.projectId || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        outcome: '',
        notes: '',
        linkedPlanType: '',
        linkedEventId: '',
        projectId: '',
      });
    }
  }, [selectedDecision, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const decisionData = {
      title: formData.title,
      description: formData.description || undefined,
      status: formData.status,
      outcome: formData.outcome || undefined,
      notes: formData.notes || undefined,
      linkedPlanType: formData.linkedPlanType || undefined,
      linkedEventId: formData.linkedEventId || undefined,
      projectId: formData.projectId || undefined,
      decidedAt: formData.status === 'decided' ? new Date() : undefined,
    };

    if (selectedDecision) {
      updateDecisionMutation.mutate({ id: selectedDecision.id, updates: decisionData });
      toast.success(`Updated "${formData.title}"`);
    } else {
      createDecisionMutation.mutate(decisionData);
      toast.success(`Created "${formData.title}"`);
    }
    onClose();
  };

  const handleDelete = () => {
    if (selectedDecision) {
      deleteDecisionMutation.mutate(selectedDecision.id);
      toast.success(`Deleted "${selectedDecision.title}"`);
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
                {selectedDecision ? 'Edit Decision' : 'New Decision'}
              </h2>
              <div className="flex items-center gap-2">
                {selectedDecision && (
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
              <form id="decision-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Decision to make..."
                    required
                    className="w-full text-lg font-semibold bg-transparent border-b-2 border-gray-200 dark:border-gray-800 focus:border-blue-500 rounded-none px-0 py-2 focus:outline-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-600 dark:text-white"
                  />
                </div>

                {/* Status */}
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Status</label>
                    <div className="flex gap-2">
                      {(['pending', 'decided', 'deferred'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFormData({ ...formData, status })}
                          className={clsx(
                            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border',
                            formData.status === status
                              ? status === 'decided' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' :
                                status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' :
                                'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-300'
                              : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {status === 'decided' ? <CheckCircle2 className="w-4 h-4" /> :
                           status === 'pending' ? <HelpCircle className="w-4 h-4" /> :
                           <ClockIcon className="w-4 h-4" />}
                          <span className="capitalize">{status}</span>
                        </button>
                      ))}
                    </div>
                </div>

                {/* Outcome - Only if decided */}
                {formData.status === 'decided' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Outcome / Decision Made
                    </label>
                    <textarea
                        value={formData.outcome}
                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        placeholder="What was decided?"
                    />
                  </motion.div>
                )}

                {/* Notes */}
                <div>
                   <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <FileText className="w-4 h-4" />
                      Notes
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Additional notes, context, or thoughts..."
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
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Brief description..."
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
                form="decision-form"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow font-medium"
              >
                {selectedDecision ? 'Save Changes' : 'Create Decision'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
