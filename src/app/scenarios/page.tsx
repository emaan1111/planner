'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ScenarioSidebar } from '@/components/scenarios/ScenarioSidebar';
import { ScenarioCalendar } from '@/components/scenarios/ScenarioCalendar';
import { CourseLibraryPanel } from '@/components/scenarios/CourseLibraryPanel';
import { PnLPanel } from '@/components/scenarios/PnLPanel';
import { PlacementEditor } from '@/components/scenarios/PlacementEditor';
import { CourseEditor } from '@/components/scenarios/CourseEditor';
import { ScenarioDndProvider } from '@/components/scenarios/ScenarioDndProvider';
import { ScenarioUndoProvider } from '@/components/scenarios/ScenarioUndoProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { useScenariosStore } from '@/store/scenariosStore';

export default function ScenariosPage() {
  const { activeScenarioId, editingPlacementId, isCourseEditorOpen } = useScenariosStore();

  return (
    <ScenarioUndoProvider>
    <ScenarioDndProvider>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Top bar */}
        <header className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            CFO · Marketing Planning Scenarios
          </h1>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: scenario / folder navigator */}
          <ScenarioSidebar />

          {/* Center: the active scenario's calendar */}
          <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950">
            <ScenarioCalendar scenarioId={activeScenarioId} />
          </main>

          {/* Right: course library + P&L stacked */}
          <aside className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900">
            <div className="flex-1 border-b border-gray-200 dark:border-gray-800 min-h-0 flex flex-col">
              <CourseLibraryPanel />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <PnLPanel />
            </div>
          </aside>
        </div>

        {editingPlacementId && <PlacementEditor />}
        {isCourseEditorOpen && <CourseEditor />}
        <ToastContainer />
      </div>
    </ScenarioDndProvider>
    </ScenarioUndoProvider>
  );
}
