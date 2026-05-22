import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ProjectionWindow = 3 | 6 | 12 | 0; // 0 = full horizon

interface ModelsUIState {
  activeModelId: string | null;
  compareIds: string[]; // models pinned for side-by-side compare strip
  projectionWindow: ProjectionWindow;
  compareMaximized: boolean;
  sidebarOpen: boolean; // mobile drawer
  rightPanelOpen: boolean; // mobile totals/charts drawer
  setActiveModel: (id: string | null) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  setProjectionWindow: (w: ProjectionWindow) => void;
  setCompareMaximized: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
}

export const useModelsStore = create<ModelsUIState>()(
  persist(
    (set, get) => ({
      activeModelId: null,
      compareIds: [],
      projectionWindow: 12,
      compareMaximized: false,
      sidebarOpen: false,
      rightPanelOpen: false,
      setActiveModel: (id) => {
        set({ activeModelId: id, sidebarOpen: false });
      },
      toggleCompare: (id) => {
        const cur = get().compareIds;
        set({ compareIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
      },
      clearCompare: () => set({ compareIds: [] }),
      setProjectionWindow: (w) => set({ projectionWindow: w }),
      setCompareMaximized: (open) => set({ compareMaximized: open }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
    }),
    {
      name: 'planner-models-ui',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        activeModelId: state.activeModelId,
        compareIds: state.compareIds,
        projectionWindow: state.projectionWindow,
      } as ModelsUIState),
    },
  ),
);
