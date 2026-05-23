'use client';

import Link from 'next/link';
import { ArrowLeft, Menu, BookOpen, X, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
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
import clsx from 'clsx';

export default function ScenariosPage() {
  const {
    activeScenarioId,
    editingPlacementId,
    isCourseEditorOpen,
    setSidebarOpen,
    rightPanelOpen,
    setRightPanelOpen,
    leftRailCollapsed,
    setLeftRailCollapsed,
    rightRailCollapsed,
    setRightRailCollapsed,
  } = useScenariosStore();

  return (
    <ScenarioUndoProvider>
    <ScenarioDndProvider>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Top bar */}
        <header className="px-3 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 -ml-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title="Open scenarios list"
            aria-label="Open scenarios list"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLeftRailCollapsed(!leftRailCollapsed)}
            className="hidden md:inline-flex p-1.5 -ml-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title={leftRailCollapsed ? 'Show scenarios sidebar' : 'Hide scenarios sidebar'}
            aria-label={leftRailCollapsed ? 'Show scenarios sidebar' : 'Hide scenarios sidebar'}
          >
            {leftRailCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <Link
            href="/"
            className="sm:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
            <span className="hidden sm:inline">CFO · Marketing Planning </span>Scenarios
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setRightPanelOpen(true)}
              className="lg:hidden inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              title="Open course library & P&L"
              aria-label="Open course library and P&L"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="text-[11px]">Library &amp; P&amp;L</span>
            </button>
            <button
              onClick={() => setRightRailCollapsed(!rightRailCollapsed)}
              className="hidden lg:inline-flex p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              title={rightRailCollapsed ? 'Show library & P&L sidebar' : 'Hide library & P&L sidebar'}
              aria-label={rightRailCollapsed ? 'Show library & P&L sidebar' : 'Hide library & P&L sidebar'}
            >
              {rightRailCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: scenario / folder navigator */}
          <ScenarioSidebar />

          {/* Center: the active scenario's calendar */}
          <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950 min-w-0">
            <ScenarioCalendar scenarioId={activeScenarioId} />
          </main>

          {/* Right: course library + P&L stacked. Drawer below lg. */}
          {rightPanelOpen && (
            <div
              onClick={() => setRightPanelOpen(false)}
              className="lg:hidden fixed inset-0 z-30 bg-gray-950/40 backdrop-blur-[1px]"
              aria-hidden
            />
          )}
          <aside
            className={clsx(
              'flex flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
              // Mobile/tablet: slide-over drawer from right
              'fixed inset-y-0 right-0 z-40 w-[88vw] max-w-sm transform transition-transform duration-200 ease-out shadow-xl',
              rightPanelOpen ? 'translate-x-0' : 'translate-x-full',
              // Desktop (lg+): static rail (hidden when collapsed)
              rightRailCollapsed
                ? 'lg:hidden'
                : 'lg:relative lg:translate-x-0 lg:shadow-none lg:w-80 lg:flex-shrink-0',
            )}
          >
            <button
              onClick={() => setRightPanelOpen(false)}
              className="lg:hidden absolute top-2 right-2 z-10 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Close"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
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
