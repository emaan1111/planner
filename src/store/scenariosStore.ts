import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ScenariosUIState {
  activeScenarioId: string | null;
  activeFolderId: string | null;
  currentMonth: string; // ISO date string (first of month)
  editingPlacementId: string | null;
  editingCourseId: string | null;
  isCourseEditorOpen: boolean;
  isNewScenarioOpen: boolean;
  sidebarOpen: boolean; // mobile scenarios drawer
  rightPanelOpen: boolean; // mobile library + P&L drawer

  setActiveScenario: (id: string | null) => void;
  setActiveFolder: (id: string | null) => void;
  setCurrentMonth: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;

  openPlacementEditor: (placementId: string) => void;
  closePlacementEditor: () => void;

  openCourseEditor: (courseId?: string) => void;
  closeCourseEditor: () => void;

  openNewScenario: () => void;
  closeNewScenario: () => void;

  setSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export const useScenariosStore = create<ScenariosUIState>()(
  persist(
    (set, get) => ({
      activeScenarioId: null,
      activeFolderId: null,
      currentMonth: startOfMonth(new Date()).toISOString(),
      editingPlacementId: null,
      editingCourseId: null,
      isCourseEditorOpen: false,
      isNewScenarioOpen: false,
      sidebarOpen: false,
      rightPanelOpen: false,

      setActiveScenario: (id) => set({ activeScenarioId: id, sidebarOpen: false }),
      setActiveFolder: (id) => set({ activeFolderId: id }),
      setCurrentMonth: (date) => set({ currentMonth: startOfMonth(date).toISOString() }),
      goToPreviousMonth: () => {
        const d = new Date(get().currentMonth);
        d.setMonth(d.getMonth() - 1);
        set({ currentMonth: d.toISOString() });
      },
      goToNextMonth: () => {
        const d = new Date(get().currentMonth);
        d.setMonth(d.getMonth() + 1);
        set({ currentMonth: d.toISOString() });
      },
      goToToday: () => set({ currentMonth: startOfMonth(new Date()).toISOString() }),

      openPlacementEditor: (placementId) => set({ editingPlacementId: placementId }),
      closePlacementEditor: () => set({ editingPlacementId: null }),

      openCourseEditor: (courseId) => set({ isCourseEditorOpen: true, editingCourseId: courseId ?? null }),
      closeCourseEditor: () => set({ isCourseEditorOpen: false, editingCourseId: null }),

      openNewScenario: () => set({ isNewScenarioOpen: true }),
      closeNewScenario: () => set({ isNewScenarioOpen: false }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
    }),
    {
      name: 'planner-scenarios-ui',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        activeScenarioId: state.activeScenarioId,
        activeFolderId: state.activeFolderId,
        currentMonth: state.currentMonth,
      } as ScenariosUIState),
    },
  ),
);
