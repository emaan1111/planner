import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  PlanEvent,
  Plan,
  Constraint,
  ConstraintViolation,
  ViewMode,
  PlanType,
  EventColor,
  AIAssistantMessage,
  PlanTypeConfig,
  PlanningContext,
  Task,
  KeyDecision,
  SavedCustomView,
  SavedCustomViewMonth,
  initialPlanTypes,
} from '@/types';
import {
  addMonths,
  isWithinInterval,
  areIntervalsOverlapping,
} from 'date-fns';

// History entry for undo/redo
interface HistoryEntry {
  type: 'add' | 'update' | 'delete';
  entityType: 'event' | 'task' | 'decision';
  before?: PlanEvent | Task | KeyDecision;
  after?: PlanEvent | Task | KeyDecision;
  description: string;
}

interface PlannerState {
  // View state
  currentDate: Date;
  viewMode: ViewMode;
  selectedPlanTypes: PlanType[];
  
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  
  // Data
  events: PlanEvent[];
  plans: Plan[];
  constraints: Constraint[];
  planTypes: PlanTypeConfig[];  // All plan types (no default/custom distinction)
  planningContext: PlanningContext[];
  tasks: Task[];
  decisions: KeyDecision[];
  
  // UI state
  selectedEvent: PlanEvent | null;
  isEventModalOpen: boolean;
  newEventDateRange: { startDate: Date; endDate: Date } | null;
  isAIAssistantOpen: boolean;
  isSidebarOpen: boolean;
  isFullscreen: boolean;
  isPlanningContextModalOpen: boolean;
  
  // Clipboard state
  clipboardEvent: PlanEvent | null;
  clipboardAction: 'cut' | 'copy' | null;
  
  // AI state
  aiMessages: AIAssistantMessage[];
  isAILoading: boolean;
  
  // Constraint violations
  violations: ConstraintViolation[];
  
  // Actions - Navigation
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: ViewMode) => void;
  goToToday: () => void;
  goToNextPeriod: () => void;
  goToPreviousPeriod: () => void;
  
  // Actions - Events
  addEvent: (event: Omit<PlanEvent, 'id' | 'createdAt' | 'updatedAt'>) => PlanEvent;
  updateEvent: (id: string, updates: Partial<PlanEvent>) => void;
  deleteEvent: (id: string) => void;
  moveEvent: (id: string, newStartDate: Date, newEndDate: Date) => void;
  resizeEvent: (id: string, newStartDate: Date, newEndDate: Date) => void;
  duplicateEvent: (id: string) => void;
  
  // Actions - Plans
  addPlan: (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePlan: (id: string, updates: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  
  // Actions - Constraints
  addConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  updateConstraint: (id: string, updates: Partial<Constraint>) => void;
  deleteConstraint: (id: string) => void;
  toggleConstraint: (id: string) => void;
  checkConstraints: () => ConstraintViolation[];
  
  // Actions - Plan Types
  addPlanType: (planType: Omit<PlanTypeConfig, 'id'>) => void;
  updatePlanType: (id: string, updates: Partial<PlanTypeConfig>) => void;
  deletePlanType: (id: string) => void;
  getPlanTypeByName: (name: string) => PlanTypeConfig | undefined;
  
  // Actions - Planning Context
  addPlanningContext: (context: Omit<PlanningContext, 'id' | 'createdAt'>) => void;
  updatePlanningContext: (id: string, updates: Partial<PlanningContext>) => void;
  deletePlanningContext: (id: string) => void;
  togglePlanningContext: (id: string) => void;
  
  // Actions - Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Actions - Key Decisions
  addDecision: (decision: Omit<KeyDecision, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDecision: (id: string, updates: Partial<KeyDecision>) => void;
  deleteDecision: (id: string) => void;
  
  // Actions - UI
  setSelectedEvent: (event: PlanEvent | null) => void;
  openEventModal: (event?: PlanEvent, dateRange?: { startDate: Date; endDate: Date }) => void;
  closeEventModal: () => void;
  toggleAIAssistant: () => void;
  toggleSidebar: () => void;
  toggleFullscreen: () => void;
  togglePlanType: (type: PlanType) => void;
  openPlanningContextModal: () => void;
  closePlanningContextModal: () => void;
  
  // Actions - Clipboard
  cutEvent: (event: PlanEvent) => void;
  copyEvent: (event: PlanEvent) => void;
  pasteEvent: (targetDate: Date) => void;
  clearClipboard: () => void;
  
  // Actions - AI
  addAIMessage: (message: Omit<AIAssistantMessage, 'id' | 'timestamp'>) => void;
  setAILoading: (loading: boolean) => void;
  clearAIMessages: () => void;
  
  // Actions - History (Undo/Redo)
  pushHistory: (entry: Omit<HistoryEntry, 'description'> & { description?: string }) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Actions - Saved Custom Views
  savedCustomViews: SavedCustomView[];
  currentCustomViewMonths: SavedCustomViewMonth[] | null;
  saveCustomView: (name: string, months: SavedCustomViewMonth[]) => SavedCustomView;
  updateCustomView: (id: string, name: string, months: SavedCustomViewMonth[]) => void;
  deleteCustomView: (id: string) => void;
  setCurrentCustomViewMonths: (months: SavedCustomViewMonth[] | null) => void;
  
  // Selectors
  getEventsForDateRange: (start: Date, end: Date) => PlanEvent[];
  getEventsForDate: (date: Date) => PlanEvent[];
  getFilteredEvents: () => PlanEvent[];
}

// Create initial plan types with IDs
const createInitialPlanTypes = (): PlanTypeConfig[] => 
  initialPlanTypes.map(pt => ({ ...pt, id: uuidv4() }));

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentDate: new Date(),
      viewMode: 'month',
      selectedPlanTypes: initialPlanTypes.map(pt => pt.name),
      
      events: [],
      plans: [],
      constraints: [
        {
          id: 'no-weekend-launches',
          name: 'No Weekend Launches',
          type: 'custom',
          description: 'Product launches should not be scheduled on weekends',
          rule: { type: 'no-weekend', params: { planTypes: ['launch'] } },
          isActive: true,
        },
        {
          id: 'min-gap-emails',
          name: 'Email Gap',
          type: 'custom',
          description: 'Maintain at least 2 days between marketing emails',
          rule: { type: 'min-gap', params: { planTypes: ['mailing'], minDays: 2 } },
          isActive: true,
        },
      ],
      
      planTypes: createInitialPlanTypes(),
      planningContext: [],
      tasks: [],
      decisions: [],
      savedCustomViews: [],
      currentCustomViewMonths: null,
      
      selectedEvent: null,
      isEventModalOpen: false,
      newEventDateRange: null,
      isAIAssistantOpen: false,
      isSidebarOpen: true,
      isFullscreen: false,
      isPlanningContextModalOpen: false,
      
      clipboardEvent: null,
      clipboardAction: null,
      
      // History state
      history: [],
      historyIndex: -1,
      
      aiMessages: [],
      isAILoading: false,
      
      violations: [],
      
      // Navigation actions
      setCurrentDate: (date) => set({ currentDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      goToToday: () => set({ currentDate: new Date() }),
      goToNextPeriod: () => {
        const { currentDate, viewMode } = get();
        const months = viewMode === 'year' ? 12 : viewMode === 'multi-month' ? 3 : 1;
        set({ currentDate: addMonths(currentDate, months) });
      },
      goToPreviousPeriod: () => {
        const { currentDate, viewMode } = get();
        const months = viewMode === 'year' ? 12 : viewMode === 'multi-month' ? 3 : 1;
        set({ currentDate: addMonths(currentDate, -months) });
      },
      
      // Event actions
      addEvent: (eventData) => {
        const now = new Date();
        const newEvent: PlanEvent = {
          ...eventData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ events: [...state.events, newEvent] }));
        get().pushHistory({ type: 'add', entityType: 'event', after: newEvent, description: `Added "${newEvent.title}"` });
        get().checkConstraints();
        return newEvent;
      },
      
      updateEvent: (id, updates) => {
        const oldEvent = get().events.find(e => e.id === id);
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? { ...event, ...updates, updatedAt: new Date() } : event
          ),
        }));
        const newEvent = get().events.find(e => e.id === id);
        if (oldEvent && newEvent) {
          get().pushHistory({ type: 'update', entityType: 'event', before: oldEvent, after: newEvent, description: `Updated "${newEvent.title}"` });
        }
        get().checkConstraints();
      },
      
      deleteEvent: (id) => {
        const oldEvent = get().events.find(e => e.id === id);
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
          selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
        }));
        if (oldEvent) {
          get().pushHistory({ type: 'delete', entityType: 'event', before: oldEvent, description: `Deleted "${oldEvent.title}"` });
        }
        get().checkConstraints();
      },
      
      moveEvent: (id, newStartDate, newEndDate) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id
              ? { ...event, startDate: newStartDate, endDate: newEndDate, updatedAt: new Date() }
              : event
          ),
        }));
        get().checkConstraints();
      },
      
      resizeEvent: (id, newStartDate, newEndDate) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id
              ? { ...event, startDate: newStartDate, endDate: newEndDate, updatedAt: new Date() }
              : event
          ),
        }));
        get().checkConstraints();
      },
      
      duplicateEvent: (id) => {
        const event = get().events.find((e) => e.id === id);
        if (event) {
          const { id: _, createdAt: __, updatedAt: ___, ...eventData } = event;
          get().addEvent(eventData);
        }
      },
      
      // Plan actions
      addPlan: (planData) => {
        const now = new Date();
        const newPlan: Plan = {
          ...planData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ plans: [...state.plans, newPlan] }));
      },
      
      updatePlan: (id, updates) => {
        set((state) => ({
          plans: state.plans.map((plan) =>
            plan.id === id ? { ...plan, ...updates, updatedAt: new Date() } : plan
          ),
        }));
      },
      
      deletePlan: (id) => {
        set((state) => ({
          plans: state.plans.filter((plan) => plan.id !== id),
        }));
      },
      
      // Constraint actions
      addConstraint: (constraintData) => {
        const newConstraint: Constraint = {
          ...constraintData,
          id: uuidv4(),
        };
        set((state) => ({ constraints: [...state.constraints, newConstraint] }));
        get().checkConstraints();
      },
      
      updateConstraint: (id, updates) => {
        set((state) => ({
          constraints: state.constraints.map((constraint) =>
            constraint.id === id ? { ...constraint, ...updates } : constraint
          ),
        }));
        get().checkConstraints();
      },
      
      deleteConstraint: (id) => {
        set((state) => ({
          constraints: state.constraints.filter((constraint) => constraint.id !== id),
        }));
        get().checkConstraints();
      },
      
      toggleConstraint: (id) => {
        set((state) => ({
          constraints: state.constraints.map((constraint) =>
            constraint.id === id ? { ...constraint, isActive: !constraint.isActive } : constraint
          ),
        }));
        get().checkConstraints();
      },
      
      checkConstraints: () => {
        const { events, constraints } = get();
        const violations: ConstraintViolation[] = [];
        
        const activeConstraints = constraints.filter((c) => c.isActive);
        
        for (const constraint of activeConstraints) {
          const { rule } = constraint;
          
          if (rule.type === 'no-weekend') {
            const planTypes = rule.params.planTypes as string[];
            for (const event of events) {
              if (planTypes.includes(event.planType)) {
                const day = event.startDate.getDay();
                if (day === 0 || day === 6) {
                  violations.push({
                    constraintId: constraint.id,
                    constraintName: constraint.name,
                    eventId: event.id,
                    message: `"${event.title}" is scheduled on a weekend`,
                    severity: 'warning',
                    suggestedFix: 'Move to a weekday',
                  });
                }
              }
            }
          }
          
          if (rule.type === 'min-gap') {
            const planTypes = rule.params.planTypes as string[];
            const minDays = rule.params.minDays as number;
            const relevantEvents = events
              .filter((e) => planTypes.includes(e.planType))
              .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
            
            for (let i = 1; i < relevantEvents.length; i++) {
              const prev = relevantEvents[i - 1];
              const curr = relevantEvents[i];
              const daysDiff = Math.floor(
                (curr.startDate.getTime() - prev.endDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysDiff < minDays) {
                violations.push({
                  constraintId: constraint.id,
                  constraintName: constraint.name,
                  eventId: curr.id,
                  message: `"${curr.title}" is too close to "${prev.title}" (${daysDiff} days apart, minimum ${minDays})`,
                  severity: 'warning',
                  suggestedFix: `Add ${minDays - daysDiff} more days between events`,
                });
              }
            }
          }
          
          if (rule.type === 'no-overlap') {
            const planTypes = rule.params.planTypes as string[];
            const relevantEvents = events.filter((e) => planTypes.includes(e.planType));
            
            for (let i = 0; i < relevantEvents.length; i++) {
              for (let j = i + 1; j < relevantEvents.length; j++) {
                const eventA = relevantEvents[i];
                const eventB = relevantEvents[j];
                
                if (
                  areIntervalsOverlapping(
                    { start: eventA.startDate, end: eventA.endDate },
                    { start: eventB.startDate, end: eventB.endDate }
                  )
                ) {
                  violations.push({
                    constraintId: constraint.id,
                    constraintName: constraint.name,
                    eventId: eventB.id,
                    message: `"${eventA.title}" and "${eventB.title}" overlap`,
                    severity: 'error',
                    suggestedFix: 'Reschedule one of the events',
                  });
                }
              }
            }
          }
        }
        
        set({ violations });
        return violations;
      },
      
      // UI actions
      setSelectedEvent: (event) => set({ selectedEvent: event }),
      openEventModal: (event, dateRange) => set({ 
        selectedEvent: event || null, 
        isEventModalOpen: true, 
        newEventDateRange: dateRange || null 
      }),
      closeEventModal: () => set({ isEventModalOpen: false, selectedEvent: null, newEventDateRange: null }),
      toggleAIAssistant: () => set((state) => ({ isAIAssistantOpen: !state.isAIAssistantOpen })),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
      togglePlanType: (type) =>
        set((state) => ({
          selectedPlanTypes: state.selectedPlanTypes.includes(type)
            ? state.selectedPlanTypes.filter((t) => t !== type)
            : [...state.selectedPlanTypes, type],
        })),
      openPlanningContextModal: () => set({ isPlanningContextModalOpen: true }),
      closePlanningContextModal: () => set({ isPlanningContextModalOpen: false }),
      
      // Plan Type actions
      addPlanType: (planTypeData) => {
        const newPlanType: PlanTypeConfig = {
          ...planTypeData,
          id: uuidv4(),
        };
        set((state) => ({ 
          planTypes: [...state.planTypes, newPlanType],
          selectedPlanTypes: [...state.selectedPlanTypes, newPlanType.name],
        }));
      },
      
      updatePlanType: (id, updates) => {
        set((state) => ({
          planTypes: state.planTypes.map((pt) =>
            pt.id === id ? { ...pt, ...updates } : pt
          ),
        }));
      },
      
      deletePlanType: (id) => {
        const planType = get().planTypes.find((pt) => pt.id === id);
        if (planType) {
          set((state) => ({
            planTypes: state.planTypes.filter((pt) => pt.id !== id),
            selectedPlanTypes: state.selectedPlanTypes.filter((t) => t !== planType.name),
          }));
        }
      },
      
      getPlanTypeByName: (name) => {
        return get().planTypes.find((pt) => pt.name === name);
      },
      
      // Planning Context actions
      addPlanningContext: (contextData) => {
        const newContext: PlanningContext = {
          ...contextData,
          id: uuidv4(),
          createdAt: new Date(),
        };
        set((state) => ({ planningContext: [...state.planningContext, newContext] }));
      },
      
      updatePlanningContext: (id, updates) => {
        set((state) => ({
          planningContext: state.planningContext.map((ctx) =>
            ctx.id === id ? { ...ctx, ...updates } : ctx
          ),
        }));
      },
      
      deletePlanningContext: (id) => {
        set((state) => ({
          planningContext: state.planningContext.filter((ctx) => ctx.id !== id),
        }));
      },
      
      togglePlanningContext: (id) => {
        set((state) => ({
          planningContext: state.planningContext.map((ctx) =>
            ctx.id === id ? { ...ctx, isActive: !ctx.isActive } : ctx
          ),
        }));
      },
      
      // Task actions
      addTask: (taskData) => {
        const now = new Date();
        const newTask: Task = {
          ...taskData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },
      
      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task
          ),
        }));
      },
      
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },
      
      // Key Decision actions
      addDecision: (decisionData) => {
        const now = new Date();
        const newDecision: KeyDecision = {
          ...decisionData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ decisions: [...state.decisions, newDecision] }));
      },
      
      updateDecision: (id, updates) => {
        set((state) => ({
          decisions: state.decisions.map((decision) =>
            decision.id === id ? { ...decision, ...updates, updatedAt: new Date() } : decision
          ),
        }));
      },
      
      deleteDecision: (id) => {
        set((state) => ({
          decisions: state.decisions.filter((decision) => decision.id !== id),
        }));
      },
      
      // Clipboard actions
      cutEvent: (event) => set({ clipboardEvent: event, clipboardAction: 'cut' }),
      copyEvent: (event) => set({ clipboardEvent: event, clipboardAction: 'copy' }),
      pasteEvent: (targetDate) => {
        const { clipboardEvent, clipboardAction, addEvent, deleteEvent } = get();
        if (!clipboardEvent) return;
        
        // Calculate the duration of the event
        const originalStart = new Date(clipboardEvent.startDate);
        const originalEnd = new Date(clipboardEvent.endDate);
        const duration = originalEnd.getTime() - originalStart.getTime();
        
        // Create new dates based on target
        const newStartDate = targetDate;
        const newEndDate = new Date(targetDate.getTime() + duration);
        
        // Create the new event
        addEvent({
          title: clipboardEvent.title,
          description: clipboardEvent.description,
          startDate: newStartDate,
          endDate: newEndDate,
          planType: clipboardEvent.planType,
          color: clipboardEvent.color,
          isAllDay: clipboardEvent.isAllDay,
          tags: clipboardEvent.tags,
          priority: clipboardEvent.priority,
          status: clipboardEvent.status,
          notes: clipboardEvent.notes,
        });
        
        // If it was a cut, delete the original
        if (clipboardAction === 'cut') {
          deleteEvent(clipboardEvent.id);
          set({ clipboardEvent: null, clipboardAction: null });
        }
      },
      clearClipboard: () => set({ clipboardEvent: null, clipboardAction: null }),
      
      // AI actions
      addAIMessage: (messageData) => {
        const newMessage: AIAssistantMessage = {
          ...messageData,
          id: uuidv4(),
          timestamp: new Date(),
        };
        set((state) => ({ aiMessages: [...state.aiMessages, newMessage] }));
      },
      setAILoading: (loading) => set({ isAILoading: loading }),
      clearAIMessages: () => set({ aiMessages: [] }),
      
      // History actions (Undo/Redo)
      pushHistory: (entry) => {
        const { history, historyIndex } = get();
        // Remove any future history if we're not at the end
        const newHistory = history.slice(0, historyIndex + 1);
        const description = entry.description || `${entry.type} ${entry.entityType}`;
        newHistory.push({ ...entry, description });
        // Keep max 50 history entries
        if (newHistory.length > 50) newHistory.shift();
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
      },
      
      undo: () => {
        const { history, historyIndex, events, tasks, decisions } = get();
        if (historyIndex < 0) return;
        
        const entry = history[historyIndex];
        
        if (entry.entityType === 'event') {
          if (entry.type === 'add' && entry.after) {
            // Undo add = remove
            set({ events: events.filter(e => e.id !== (entry.after as PlanEvent).id) });
          } else if (entry.type === 'delete' && entry.before) {
            // Undo delete = restore
            set({ events: [...events, entry.before as PlanEvent] });
          } else if (entry.type === 'update' && entry.before) {
            // Undo update = restore previous state
            set({
              events: events.map(e =>
                e.id === (entry.before as PlanEvent).id ? (entry.before as PlanEvent) : e
              ),
            });
          }
        } else if (entry.entityType === 'task') {
          if (entry.type === 'add' && entry.after) {
            set({ tasks: tasks.filter(t => t.id !== (entry.after as Task).id) });
          } else if (entry.type === 'delete' && entry.before) {
            set({ tasks: [...tasks, entry.before as Task] });
          } else if (entry.type === 'update' && entry.before) {
            set({
              tasks: tasks.map(t =>
                t.id === (entry.before as Task).id ? (entry.before as Task) : t
              ),
            });
          }
        } else if (entry.entityType === 'decision') {
          if (entry.type === 'add' && entry.after) {
            set({ decisions: decisions.filter(d => d.id !== (entry.after as KeyDecision).id) });
          } else if (entry.type === 'delete' && entry.before) {
            set({ decisions: [...decisions, entry.before as KeyDecision] });
          } else if (entry.type === 'update' && entry.before) {
            set({
              decisions: decisions.map(d =>
                d.id === (entry.before as KeyDecision).id ? (entry.before as KeyDecision) : d
              ),
            });
          }
        }
        
        set({ historyIndex: historyIndex - 1 });
      },
      
      redo: () => {
        const { history, historyIndex, events, tasks, decisions } = get();
        if (historyIndex >= history.length - 1) return;
        
        const entry = history[historyIndex + 1];
        
        if (entry.entityType === 'event') {
          if (entry.type === 'add' && entry.after) {
            set({ events: [...events, entry.after as PlanEvent] });
          } else if (entry.type === 'delete' && entry.before) {
            set({ events: events.filter(e => e.id !== (entry.before as PlanEvent).id) });
          } else if (entry.type === 'update' && entry.after) {
            set({
              events: events.map(e =>
                e.id === (entry.after as PlanEvent).id ? (entry.after as PlanEvent) : e
              ),
            });
          }
        } else if (entry.entityType === 'task') {
          if (entry.type === 'add' && entry.after) {
            set({ tasks: [...tasks, entry.after as Task] });
          } else if (entry.type === 'delete' && entry.before) {
            set({ tasks: tasks.filter(t => t.id !== (entry.before as Task).id) });
          } else if (entry.type === 'update' && entry.after) {
            set({
              tasks: tasks.map(t =>
                t.id === (entry.after as Task).id ? (entry.after as Task) : t
              ),
            });
          }
        } else if (entry.entityType === 'decision') {
          if (entry.type === 'add' && entry.after) {
            set({ decisions: [...decisions, entry.after as KeyDecision] });
          } else if (entry.type === 'delete' && entry.before) {
            set({ decisions: decisions.filter(d => d.id !== (entry.before as KeyDecision).id) });
          } else if (entry.type === 'update' && entry.after) {
            set({
              decisions: decisions.map(d =>
                d.id === (entry.after as KeyDecision).id ? (entry.after as KeyDecision) : d
              ),
            });
          }
        }
        
        set({ historyIndex: historyIndex + 1 });
      },
      
      canUndo: () => get().historyIndex >= 0,
      canRedo: () => get().historyIndex < get().history.length - 1,
      
      // Saved Custom Views actions
      saveCustomView: (name, months) => {
        const newView: SavedCustomView = {
          id: uuidv4(),
          name,
          months: months.map(m => ({ ...m })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          savedCustomViews: [...state.savedCustomViews, newView],
        }));
        return newView;
      },
      
      updateCustomView: (id, name, months) => {
        set((state) => ({
          savedCustomViews: state.savedCustomViews.map((view) =>
            view.id === id
              ? { ...view, name, months: months.map(m => ({ ...m })), updatedAt: new Date() }
              : view
          ),
        }));
      },
      
      deleteCustomView: (id) => {
        set((state) => ({
          savedCustomViews: state.savedCustomViews.filter((view) => view.id !== id),
        }));
      },
      
      setCurrentCustomViewMonths: (months) => {
        set({ currentCustomViewMonths: months ? months.map(m => ({ ...m })) : null });
      },
      
      // Selectors
      getEventsForDateRange: (start, end) => {
        const { events, selectedPlanTypes } = get();
        return events.filter(
          (event) =>
            selectedPlanTypes.includes(event.planType) &&
            (isWithinInterval(event.startDate, { start, end }) ||
              isWithinInterval(event.endDate, { start, end }) ||
              (event.startDate <= start && event.endDate >= end))
        );
      },
      
      getEventsForDate: (date) => {
        const { events, selectedPlanTypes } = get();
        return events.filter(
          (event) =>
            selectedPlanTypes.includes(event.planType) &&
            isWithinInterval(date, { start: event.startDate, end: event.endDate })
        );
      },
      
      getFilteredEvents: () => {
        const { events, selectedPlanTypes } = get();
        return events.filter((event) => selectedPlanTypes.includes(event.planType));
      },
    }),
    {
      name: 'planner-storage',
      partialize: (state) => ({
        events: state.events,
        plans: state.plans,
        constraints: state.constraints,
        selectedPlanTypes: state.selectedPlanTypes,
        tasks: state.tasks,
        decisions: state.decisions,
        planTypes: state.planTypes,
        viewMode: state.viewMode,
        isSidebarOpen: state.isSidebarOpen,
        savedCustomViews: state.savedCustomViews,
        currentCustomViewMonths: state.currentCustomViewMonths,
      }),
    }
  )
);
