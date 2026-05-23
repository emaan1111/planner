import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ScenarioViewMode = 'month' | 'three-month' | 'six-month' | 'year' | 'custom';

export interface ScenarioCustomMonth {
  year: number;
  month: number; // 0-11
}

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
  leftRailCollapsed: boolean; // desktop scenarios rail hidden
  rightRailCollapsed: boolean; // desktop library + P&L rail hidden
  viewMode: ScenarioViewMode;
  customMonths: ScenarioCustomMonth[];
  showDelivery: boolean; // show delivery bars on the calendar
  notesPanelOpen: boolean; // inline scenario notes panel
  showSidebarRevenue: boolean; // show total lifetime revenue beside scenario names

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
  setLeftRailCollapsed: (collapsed: boolean) => void;
  setRightRailCollapsed: (collapsed: boolean) => void;
  setViewMode: (mode: ScenarioViewMode) => void;
  setCustomMonths: (months: ScenarioCustomMonth[]) => void;
  toggleCustomMonth: (year: number, month: number) => void;
  toggleDelivery: () => void;
  setNotesPanelOpen: (open: boolean) => void;
  toggleSidebarRevenue: () => void;
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
      leftRailCollapsed: false,
      rightRailCollapsed: false,
      viewMode: 'month',
      customMonths: [],
      showDelivery: true,
      notesPanelOpen: false,
      showSidebarRevenue: false,

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
      setLeftRailCollapsed: (collapsed) => set({ leftRailCollapsed: collapsed }),
      setRightRailCollapsed: (collapsed) => set({ rightRailCollapsed: collapsed }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setCustomMonths: (months) => set({ customMonths: months }),
      toggleCustomMonth: (year, month) => {
        const current = get().customMonths;
        const idx = current.findIndex((m) => m.year === year && m.month === month);
        if (idx >= 0) {
          set({ customMonths: current.filter((_, i) => i !== idx) });
        } else {
          set({ customMonths: [...current, { year, month }].sort((a, b) => a.year - b.year || a.month - b.month) });
        }
      },
      toggleDelivery: () => set({ showDelivery: !get().showDelivery }),
      setNotesPanelOpen: (open) => set({ notesPanelOpen: open }),
      toggleSidebarRevenue: () => set({ showSidebarRevenue: !get().showSidebarRevenue }),
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
        leftRailCollapsed: state.leftRailCollapsed,
        rightRailCollapsed: state.rightRailCollapsed,
        viewMode: state.viewMode,
        customMonths: state.customMonths,
        showDelivery: state.showDelivery,
        showSidebarRevenue: state.showSidebarRevenue,
      } as ScenariosUIState),
    },
  ),
);
