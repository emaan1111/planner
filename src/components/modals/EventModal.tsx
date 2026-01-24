'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlannerStore } from '@/store/plannerStore';
import { PlanEvent, PlanType, EventColor, colorClasses, RecurrencePattern } from '@/types';
import { X, Calendar, Clock, Tag, Flag, Palette, Trash2, Copy, Save, Sparkles, Repeat, ChevronDown } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import clsx from 'clsx';
import { toast } from '@/components/ui/Toast';

// Color categories for the color picker
const colorCategories = {
  'Standard': ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'] as EventColor[],
  'Pastel': ['pastel-pink', 'pastel-rose', 'pastel-purple', 'pastel-violet', 'pastel-indigo', 'pastel-blue', 'pastel-sky', 'pastel-cyan', 'pastel-teal', 'pastel-emerald', 'pastel-green', 'pastel-lime', 'pastel-yellow', 'pastel-amber', 'pastel-orange', 'pastel-red'] as EventColor[],
  'Soft': ['soft-blush', 'soft-coral', 'soft-peach', 'soft-cream', 'soft-lavender', 'soft-periwinkle', 'soft-mint', 'soft-sage'] as EventColor[],
  'Special': ['coral', 'salmon', 'peach', 'buttercup', 'mint', 'aqua', 'sea-green', 'powder-blue', 'lavender', 'mauve', 'plum', 'dusty-rose', 'gold', 'bronze'] as EventColor[],
  'Neutral': ['slate', 'gray', 'zinc', 'stone', 'neutral'] as EventColor[],
};
const allColors: EventColor[] = Object.values(colorCategories).flat();
const priorities = ['low', 'medium', 'high', 'urgent'] as const;
const recurrenceOptions = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export function EventModal() {
  const {
    isEventModalOpen,
    closeEventModal,
    selectedEvent,
    newEventDateRange,
    addEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    currentDate,
    planTypes,
  } = usePlannerStore();

  // Get the first plan type as default, or 'custom' if none exist
  const defaultPlanType = planTypes.length > 0 ? planTypes[0].name : 'custom';
  const defaultColor = planTypes.length > 0 ? planTypes[0].color : 'blue';

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    planType: PlanType;
    color: EventColor;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tags: string;
    notes: string;
    recurrence: '' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    recurrenceInterval: number;
    recurrenceEndDate: string;
  }>({
    title: '',
    description: '',
    startDate: format(currentDate, 'yyyy-MM-dd'),
    endDate: format(addDays(currentDate, 1), 'yyyy-MM-dd'),
    planType: defaultPlanType,
    color: defaultColor,
    priority: 'medium',
    tags: '',
    notes: '',
    recurrence: '',
    recurrenceInterval: 1,
    recurrenceEndDate: '',
  });

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedEvent) {
      setFormData({
        title: selectedEvent.title,
        description: selectedEvent.description || '',
        startDate: format(new Date(selectedEvent.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(selectedEvent.endDate), 'yyyy-MM-dd'),
        planType: selectedEvent.planType,
        color: selectedEvent.color,
        priority: selectedEvent.priority || 'medium',
        tags: selectedEvent.tags?.join(', ') || '',
        notes: selectedEvent.notes || '',
        recurrence: selectedEvent.recurrence?.frequency || '',
        recurrenceInterval: selectedEvent.recurrence?.interval || 1,
        recurrenceEndDate: selectedEvent.recurrence?.endDate 
          ? format(new Date(selectedEvent.recurrence.endDate), 'yyyy-MM-dd') 
          : '',
      });
      setShowRecurrenceOptions(!!selectedEvent.recurrence);
    } else {
      // Use newEventDateRange if provided (from drag selection), otherwise use currentDate
      const startDate = newEventDateRange?.startDate || currentDate;
      const endDate = newEventDateRange?.endDate || addDays(currentDate, 1);
      
      setFormData({
        title: '',
        description: '',
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        planType: defaultPlanType,
        color: defaultColor,
        priority: 'medium',
        tags: '',
        notes: '',
        recurrence: '',
        recurrenceInterval: 1,
        recurrenceEndDate: '',
      });
      setShowRecurrenceOptions(false);
    }
  }, [selectedEvent, currentDate, isEventModalOpen, defaultPlanType, defaultColor, newEventDateRange]);

  // Auto-save notes when editing an existing event
  const autoSaveNotes = useCallback((notes: string) => {
    if (!selectedEvent) return;
    
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    
    autoSaveTimeout.current = setTimeout(() => {
      updateEvent(selectedEvent.id, { notes });
      toast.success('Notes saved');
    }, 1500);
  }, [selectedEvent, updateEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build recurrence pattern if set
    const recurrence: RecurrencePattern | undefined = formData.recurrence 
      ? {
          frequency: formData.recurrence,
          interval: formData.recurrenceInterval,
          endDate: formData.recurrenceEndDate ? parseISO(formData.recurrenceEndDate) : undefined,
        }
      : undefined;

    const eventData = {
      title: formData.title,
      description: formData.description,
      startDate: parseISO(formData.startDate),
      endDate: parseISO(formData.endDate),
      planType: formData.planType,
      color: formData.color,
      priority: formData.priority,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: formData.notes,
      isAllDay: true,
      status: 'planned' as const,
      recurrence,
    };

    if (selectedEvent) {
      updateEvent(selectedEvent.id, eventData);
      toast.success(`Updated "${formData.title}"`);
    } else {
      addEvent(eventData);
      toast.success(`Created "${formData.title}"`);
    }

    closeEventModal();
  };

  const handleDelete = () => {
    if (selectedEvent) {
      const title = selectedEvent.title;
      deleteEvent(selectedEvent.id);
      toast.success(`Deleted "${title}"`, {
        label: 'Undo',
        onClick: () => {
          // Undo is handled by the undo system
          usePlannerStore.getState().undo();
        },
      });
      closeEventModal();
    }
  };

  const handleDuplicate = () => {
    if (selectedEvent) {
      duplicateEvent(selectedEvent.id);
      toast.success(`Duplicated "${selectedEvent.title}"`);
      closeEventModal();
    }
  };

  const handlePlanTypeChange = (type: PlanType) => {
    const planType = planTypes.find(pt => pt.name === type);
    const newColor = planType ? planType.color : formData.color;
    
    setFormData(prev => ({
      ...prev,
      planType: type,
      color: newColor,
    }));
  };

  const generateWithAI = async () => {
    if (!formData.planType) return;

    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: formData.planType,
          startDate: formData.startDate,
        }),
      });

      const data = await response.json();
      if (data.suggestion) {
        setFormData(prev => ({
          ...prev,
          title: data.suggestion.title || prev.title,
          description: data.suggestion.description || prev.description,
          tags: data.suggestion.tags?.join(', ') || prev.tags,
        }));
      }
    } catch (error) {
      console.log('AI generation not available');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <AnimatePresence>
      {isEventModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEventModal}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl glass-modal rounded-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {selectedEvent ? 'Edit Event' : 'Create Event'}
              </h2>
              <div className="flex items-center gap-2">
                {selectedEvent && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDuplicate}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDelete}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeEventModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Title
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter event title..."
                    required
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={generateWithAI}
                    disabled={isGeneratingAI}
                    className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGeneratingAI ? 'Generating...' : 'AI'}
                  </motion.button>
                </div>
              </div>

              {/* Plan Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plan Type
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {planTypes.map((planType) => {
                    const isSelected = formData.planType === planType.name;

                    return (
                      <motion.button
                        key={planType.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePlanTypeChange(planType.name)}
                        className={clsx(
                          'p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                          isSelected
                            ? `border-${planType.color}-500 ${colorClasses[planType.color]?.light || ''}`
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs',
                            colorClasses[planType.color]?.bg || 'bg-gray-500'
                          )}
                        >
                          {planType.label.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate w-full text-center">
                          {planType.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Clock className="w-4 h-4" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowRecurrenceOptions(!showRecurrenceOptions)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-colors"
                >
                  <Repeat className="w-4 h-4" />
                  <span>
                    {formData.recurrence 
                      ? `Repeats ${formData.recurrence}${formData.recurrenceInterval > 1 ? ` (every ${formData.recurrenceInterval})` : ''}`
                      : 'Add recurrence'
                    }
                  </span>
                  <ChevronDown className={clsx('w-4 h-4 transition-transform', showRecurrenceOptions && 'rotate-180')} />
                </button>
                
                <AnimatePresence>
                  {showRecurrenceOptions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3">
                        <div className="flex gap-3">
                          <select
                            value={formData.recurrence}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              recurrence: e.target.value as typeof formData.recurrence 
                            }))}
                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {recurrenceOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          
                          {formData.recurrence && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">every</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={formData.recurrenceInterval}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  recurrenceInterval: parseInt(e.target.value) || 1 
                                }))}
                                className="w-16 px-2 py-2 bg-white dark:bg-gray-800 rounded-lg text-center text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-500">
                                {formData.recurrence === 'daily' ? 'day(s)' :
                                 formData.recurrence === 'weekly' ? 'week(s)' :
                                 formData.recurrence === 'monthly' ? 'month(s)' : 'year(s)'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {formData.recurrence && (
                          <div>
                            <label className="text-sm text-gray-500 mb-1 block">End date (optional)</label>
                            <input
                              type="date"
                              value={formData.recurrenceEndDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                              min={formData.startDate}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Color & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Palette className="w-4 h-4" />
                    Color
                  </label>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl max-h-48 overflow-y-auto space-y-3">
                    {Object.entries(colorCategories).map(([category, categoryColors]) => (
                      <div key={category}>
                        <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{category}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {categoryColors.map((color) => (
                            <motion.button
                              key={color}
                              type="button"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setFormData(prev => ({ ...prev, color }))}
                              title={color.replace('-', ' ')}
                              className={clsx(
                                'w-5 h-5 rounded-full transition-all',
                                colorClasses[color].bg,
                                formData.color === color && 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-800'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Flag className="w-4 h-4" />
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {priorities.map((priority) => (
                      <motion.button
                        key={priority}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData(prev => ({ ...prev, priority }))}
                        className={clsx(
                          'flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all',
                          formData.priority === priority
                            ? priority === 'urgent'
                              ? 'bg-red-500 text-white'
                              : priority === 'high'
                              ? 'bg-orange-500 text-white'
                              : priority === 'medium'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {priority}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add event description..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="w-4 h-4" />
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="marketing, social, Q1..."
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span>Notes</span>
                  {selectedEvent && (
                    <span className="text-xs text-gray-400">Auto-saves as you type</span>
                  )}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, notes: e.target.value }));
                    autoSaveNotes(e.target.value);
                  }}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={closeEventModal}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {selectedEvent ? 'Save Changes' : 'Create Event'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
