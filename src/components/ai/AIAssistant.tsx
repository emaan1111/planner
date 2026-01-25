'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/useEventsQuery';
import { usePlanTypes, useCreatePlanType, useDeletePlanType } from '@/hooks/usePlanTypesQuery';
import { useConstraints } from '@/hooks/useConstraintsQuery';
import { useTasks, useCreateTask } from '@/hooks/useTasksQuery';
import { useProjects, useCreateProject } from '@/hooks/useProjectsQuery';
import { Sparkles, Send, X, Loader2, Lightbulb, Calendar, AlertCircle, Wand2, Play, Check } from 'lucide-react';
import clsx from 'clsx';
import { EventColor, PlanEvent, Project } from '@/types';

const quickPrompts = [
  { icon: Calendar, label: 'Plan my marketing for next month', prompt: 'Help me create a marketing plan for next month with email campaigns, social media posts, and content releases.' },
  { icon: Wand2, label: 'Optimize my schedule', prompt: 'Analyze my current schedule and suggest optimizations to avoid conflicts and improve timing.' },
  { icon: AlertCircle, label: 'Review conflicts', prompt: 'Review all my current planning conflicts and suggest how to resolve them.' },
  { icon: Lightbulb, label: 'Launch plan template', prompt: 'Create a product launch plan template with all necessary milestones and marketing activities.' },
];

interface AIAction {
  action: string;
  payload: Record<string, unknown>;
  description?: string;
}

export function AIAssistant() {
  const {
    isAIAssistantOpen,
    toggleAIAssistant,
    aiMessages,
    addAIMessage,
    isAILoading,
    setAILoading,
    violations,
    planningContext,
  } = useUIStore();

  const { data: events = [] } = useEvents();
  const { data: tasks = [] } = useTasks();
  const { data: planTypes = [] } = usePlanTypes();
  const { data: constraints = [] } = useConstraints();
  const { data: projects = [] } = useProjects();
  
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  const createTaskMutation = useCreateTask();
  const createPlanTypeMutation = useCreatePlanType();
  const deletePlanTypeMutation = useDeletePlanType();
  const createProjectMutation = useCreateProject();
  
  const addEvent = useCallback((event: Omit<PlanEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    createEventMutation.mutate(event);
  }, [createEventMutation]);
  
  const updateEvent = useCallback((id: string, updates: Partial<PlanEvent>) => {
    updateEventMutation.mutate({ id, updates });
  }, [updateEventMutation]);
  
  const deleteEvent = useCallback((id: string) => {
    deleteEventMutation.mutate(id);
  }, [deleteEventMutation]);

  const addTask = useCallback((task: {
    title: string;
    description?: string;
    status?: 'todo' | 'in-progress' | 'scheduled' | 'done';
    priority?: 'low' | 'medium' | 'high';
    dueDate?: Date;
    linkedPlanType: string;
    linkedEventId?: string;
  }) => {
    createTaskMutation.mutate({
      title: task.title,
      description: task.description,
      status: task.status ?? 'todo',
      priority: task.priority ?? 'medium',
      dueDate: task.dueDate,
      linkedPlanType: task.linkedPlanType,
      linkedEventId: task.linkedEventId,
    });
  }, [createTaskMutation]);
  
  const addPlanType = useCallback((pt: { name: string; label: string; color: EventColor; icon: string }) => {
    createPlanTypeMutation.mutate(pt);
  }, [createPlanTypeMutation]);
  
  const deletePlanType = useCallback((id: string) => {
    deletePlanTypeMutation.mutate(id);
  }, [deletePlanTypeMutation]);
  
  const addProject = useCallback((project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    createProjectMutation.mutate(project);
  }, [createProjectMutation]);

  const [input, setInput] = useState('');
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
  const [executedActions, setExecutedActions] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages]);

  const executeAction = (action: AIAction, index: number) => {
    try {
      switch (action.action) {
        case 'add_event':
          addEvent({
            title: action.payload.title as string,
            description: action.payload.description as string || '',
            startDate: new Date(action.payload.startDate as string),
            endDate: new Date(action.payload.endDate as string),
            planType: action.payload.planType as string,
            color: (action.payload.color as EventColor) || 'blue',
            isAllDay: true,
          });
          break;
        case 'update_event':
          updateEvent(action.payload.id as string, action.payload);
          break;
        case 'delete_event':
          deleteEvent(action.payload.id as string);
          break;
        case 'add_task': {
          const dueDate = action.payload.dueDate
            ? new Date(action.payload.dueDate as string)
            : undefined;
          if (!action.payload.linkedPlanType) {
            throw new Error('linkedPlanType is required to create a task');
          }
          addTask({
            title: (action.payload.title as string) || 'Untitled Task',
            description: action.payload.description as string,
            status: action.payload.status as 'todo' | 'in-progress' | 'scheduled' | 'done',
            priority: action.payload.priority as 'low' | 'medium' | 'high',
            dueDate,
            linkedPlanType: action.payload.linkedPlanType as string,
            linkedEventId: action.payload.linkedEventId as string,
          });
          break;
        }
        case 'add_plan_type':
          addPlanType({
            name: action.payload.name as string,
            label: action.payload.label as string,
            color: (action.payload.color as EventColor) || 'blue',
            icon: (action.payload.icon as string) || 'Star',
          });
          break;
        case 'delete_plan_type':
          deletePlanType(action.payload.id as string);
          break;
        case 'add_project':
          addProject({
            name: action.payload.name as string,
            description: action.payload.description as string || '',
            color: (action.payload.color as EventColor) || 'blue',
            isActive: true,
          });
          break;
      }
      setExecutedActions(prev => new Set([...prev, index]));
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  const executeAllActions = () => {
    pendingActions.forEach((action, index) => {
      if (!executedActions.has(index)) {
        executeAction(action, index);
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isAILoading) return;

    const userMessage = input.trim();
    setInput('');
    setPendingActions([]);
    setExecutedActions(new Set());
    addAIMessage({ role: 'user', content: userMessage });
    setAILoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: {
            events: events.map(e => ({
              id: e.id,
              title: e.title,
              type: e.planType,
              startDate: e.startDate,
              endDate: e.endDate,
              color: e.color,
            })),
            tasks: tasks.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate ? t.dueDate.toISOString() : null,
              linkedPlanType: t.linkedPlanType,
              linkedEventId: t.linkedEventId,
            })),
            constraints: constraints.map(c => ({
              name: c.name,
              description: c.description,
              isActive: c.isActive,
            })),
            planningContext: planningContext.map(p => ({
              type: p.type,
              title: p.title,
              description: p.description,
              isActive: p.isActive,
            })),
            planTypes: planTypes.map(t => ({
              id: t.id,
              name: t.name,
              label: t.label,
              color: t.color,
            })),
            projects: projects.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              color: p.color,
              isActive: p.isActive,
            })),
            violations: violations.map(v => ({
              message: v.message,
              suggestedFix: v.suggestedFix,
            })),
          },
        }),
      });

      const data = await response.json();
      
      // Store any actions returned by the AI
      if (data.actions && data.actions.length > 0) {
        setPendingActions(data.actions);
      }
      
      addAIMessage({
        role: 'assistant',
        content: data.message || 'I can help you plan your events and resolve conflicts. Try asking me to create a marketing plan or optimize your schedule!',
        suggestions: data.suggestions,
      });
    } catch (error) {
      addAIMessage({
        role: 'assistant',
        content: 'I\'m here to help you with planning! You can ask me to:\n\n• Create marketing, launch, or content plans\n• Analyze your schedule for conflicts\n• Suggest optimal timing for events\n• Help organize your tasks by priority\n\nNote: For full AI capabilities, configure your OpenAI API key in the environment.',
      });
    } finally {
      setAILoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <AnimatePresence>
      {isAIAssistantOpen && (
        <motion.div
          initial={{ opacity: 0, x: 400, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 400 }}
          exit={{ opacity: 0, x: 400, width: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 h-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-gray-200">AI Planner</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your smart planning assistant</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleAIAssistant}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </motion.button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiMessages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Hi! I'm your AI planning assistant
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    I can help you create plans, optimize schedules, and resolve conflicts.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">
                    Quick actions
                  </p>
                  {quickPrompts.map((item, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-purple-500" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {aiMessages.map((message, idx) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={clsx(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={clsx(
                    'max-w-[85%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion) => (
                        <motion.button
                          key={suggestion.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full p-2 bg-white dark:bg-gray-700 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                          onClick={suggestion.action}
                        >
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                            {suggestion.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {suggestion.description}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isAILoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                </div>
              </motion.div>
            )}

            {/* Pending Actions from AI */}
            {pendingActions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                    AI Suggested Actions ({pendingActions.length})
                  </h4>
                  {pendingActions.length > 1 && executedActions.size < pendingActions.length && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={executeAllActions}
                      className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Execute All
                    </motion.button>
                  )}
                </div>
                <div className="space-y-2">
                  {pendingActions.map((action, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={clsx(
                        'flex items-center justify-between p-3 rounded-lg transition-all',
                        executedActions.has(idx)
                          ? 'bg-green-100 dark:bg-green-800/30'
                          : 'bg-white dark:bg-gray-800'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {action.description || `${action.action}: ${action.payload.title || action.payload.name || action.payload.id}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {action.action.replace('_', ' ')}
                        </p>
                      </div>
                      {executedActions.has(idx) ? (
                        <div className="p-2 text-green-500">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => executeAction(action, idx)}
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          <Play className="w-4 h-4" />
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask AI to help plan..."
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!input.trim() || isAILoading}
                className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
