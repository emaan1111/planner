import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ViewMode,
  PlanType,
  PlanEvent,
  AIAssistantMessage,
  PlanningContext,
  ConstraintViolation,
  SavedCustomView,
  SavedCustomViewMonth,
  initialPlanTypes,
} from '@/types';
import { addMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface UIState {
  // Navigation
  currentDate: Date;
  viewMode: ViewMode;
  
  // Filter state
  selectedPlanTypes: PlanType[];
  
  // UI visibility
  isEventModalOpen: boolean;
  selectedEvent: PlanEvent | null;
  newEventDateRange: { startDate: Date; endDate: Date } | null;
  isAIAssistantOpen: boolean;
  isSidebarOpen: boolean;
  isFullscreen: boolean;
  isPlanningContextModalOpen: boolean;
  
  // Clipboard
  clipboardEvent: PlanEvent | null;
  clipboardAction: 'cut' | 'copy' | null;
  
  // AI state
  aiMessages: AIAssistantMessage[];
  isAILoading: boolean;
  
  // Constraint violations (computed from events + constraints)
  violations: ConstraintViolation[];
  
  // Planning context (local only for now)
  planningContext: PlanningContext[];
  
  // Saved custom views (persisted locally)
  savedCustomViews: SavedCustomView[];
  currentCustomViewMonths: SavedCustomViewMonth[] | null;
  
  // Navigation actions
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: ViewMode) => void;
  goToToday: () => void;
  goToNextPeriod: () => void;
  goToPreviousPeriod: () => void;
  
  // Filter actions
  togglePlanType: (type: PlanType) => void;
  setSelectedPlanTypes: (types: PlanType[]) => void;
  syncPlanTypes: (types: PlanType[]) => void;
  
  // UI actions
  openEventModal: (event?: PlanEvent, dateRange?: { startDate: Date; endDate: Date }) => void;
  closeEventModal: () => void;
  setSelectedEvent: (event: PlanEvent | null) => void;
  toggleAIAssistant: () => void;
  toggleSidebar: () => void;
  toggleFullscreen: () => void;
  openPlanningContextModal: () => void;
  closePlanningContextModal: () => void;
  
  // Clipboard actions
  cutEvent: (event: PlanEvent) => void;
  copyEvent: (event: PlanEvent) => void;
  clearClipboard: () => void;
  
  // AI actions
  addAIMessage: (message: Omit<AIAssistantMessage, 'id' | 'timestamp'>) => void;
  setAILoading: (loading: boolean) => void;
  clearAIMessages: () => void;
  
  // Violations
  setViolations: (violations: ConstraintViolation[]) => void;
  
  // Planning context actions
  addPlanningContext: (context: Omit<PlanningContext, 'id' | 'createdAt'>) => void;
  updatePlanningContext: (id: string, updates: Partial<PlanningContext>) => void;
  deletePlanningContext: (id: string) => void;
  togglePlanningContext: (id: string) => void;
  
  // Saved custom views actions
  saveCustomView: (name: string, months: SavedCustomViewMonth[]) => SavedCustomView;
  updateCustomView: (id: string, name: string, months: SavedCustomViewMonth[]) => void;
  deleteCustomView: (id: string) => void;
  setCurrentCustomViewMonths: (months: SavedCustomViewMonth[] | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentDate: new Date(),
      viewMode: 'month',
      selectedPlanTypes: initialPlanTypes.map(pt => pt.name),
      
      isEventModalOpen: false,
      selectedEvent: null,
      newEventDateRange: null,
      isAIAssistantOpen: false,
      isSidebarOpen: true,
      isFullscreen: false,
      isPlanningContextModalOpen: false,
      
      clipboardEvent: null,
      clipboardAction: null,
      
      aiMessages: [],
      isAILoading: false,
      
      violations: [],
      
      planningContext: [],
      
      savedCustomViews: [],
      currentCustomViewMonths: null,
      
      // Navigation actions
      setCurrentDate: (date) => set({ currentDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),
      goToToday: () => set({ currentDate: new Date() }),
      goToNextPeriod: () => {
        const { currentDate, viewMode } = get();
        const months = viewMode === 'year' ? 12 : viewMode === 'multi-month' ? 3 : viewMode === 'six-month' ? 6 : 1;
        set({ currentDate: addMonths(currentDate, months) });
      },
      goToPreviousPeriod: () => {
        const { currentDate, viewMode } = get();
        const months = viewMode === 'year' ? 12 : viewMode === 'multi-month' ? 3 : viewMode === 'six-month' ? 6 : 1;
        set({ currentDate: addMonths(currentDate, -months) });
      },
      
      // Filter actions
      togglePlanType: (type) => {
        set((state) => ({
          selectedPlanTypes: state.selectedPlanTypes.includes(type)
            ? state.selectedPlanTypes.filter((t) => t !== type)
            : [...state.selectedPlanTypes, type],
        }));
      },
      setSelectedPlanTypes: (types) => set({ selectedPlanTypes: types }),
      syncPlanTypes: (types) => {
        set((state) => {
          const newTypes = types.filter(t => !state.selectedPlanTypes.includes(t));
          if (newTypes.length > 0) {
            return { selectedPlanTypes: [...state.selectedPlanTypes, ...newTypes] };
          }
          return state;
        });
      },
      
      // UI actions
      openEventModal: (event, dateRange) => {
        set({
          isEventModalOpen: true,
          selectedEvent: event || null,
          newEventDateRange: dateRange || null,
        });
      },
      closeEventModal: () => {
        set({
          isEventModalOpen: false,
          selectedEvent: null,
          newEventDateRange: null,
        });
      },
      setSelectedEvent: (event) => set({ selectedEvent: event }),
      toggleAIAssistant: () => set((state) => ({ isAIAssistantOpen: !state.isAIAssistantOpen })),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
      openPlanningContextModal: () => set({ isPlanningContextModalOpen: true }),
      closePlanningContextModal: () => set({ isPlanningContextModalOpen: false }),
      
      // Clipboard actions
      cutEvent: (event) => set({ clipboardEvent: event, clipboardAction: 'cut' }),
      copyEvent: (event) => set({ clipboardEvent: event, clipboardAction: 'copy' }),
      clearClipboard: () => set({ clipboardEvent: null, clipboardAction: null }),
      
      // AI actions
      addAIMessage: (message) => {
        const newMessage: AIAssistantMessage = {
          ...message,
          id: uuidv4(),
          timestamp: new Date(),
        };
        set((state) => ({ aiMessages: [...state.aiMessages, newMessage] }));
      },
      setAILoading: (loading) => set({ isAILoading: loading }),
      clearAIMessages: () => set({ aiMessages: [] }),
      
      // Violations
      setViolations: (violations) => set({ violations }),
      
      // Planning context actions
      addPlanningContext: (context) => {
        const newContext: PlanningContext = {
          ...context,
          id: uuidv4(),
          createdAt: new Date(),
        };
        set((state) => ({ planningContext: [...state.planningContext, newContext] }));
      },
      updatePlanningContext: (id, updates) => {
        set((state) => ({
          planningContext: state.planningContext.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },
      deletePlanningContext: (id) => {
        set((state) => ({
          planningContext: state.planningContext.filter((c) => c.id !== id),
        }));
      },
      togglePlanningContext: (id) => {
        set((state) => ({
          planningContext: state.planningContext.map((c) =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
          ),
        }));
      },
      
      // Saved custom views actions
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
    }),
    {
      name: 'planner-ui-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        selectedPlanTypes: state.selectedPlanTypes,
        viewMode: state.viewMode,
        isSidebarOpen: state.isSidebarOpen,
        planningContext: state.planningContext,
        savedCustomViews: state.savedCustomViews,
        currentCustomViewMonths: state.currentCustomViewMonths,
      } as UIState),
    }
  )
);
