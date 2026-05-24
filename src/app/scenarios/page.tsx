'use client';

import { useEffect, useRef, useState } from 'react';
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
    rightRailWidth,
    setRightRailWidth,
  } = useScenariosStore();

  // Drag-resize the right rail. Only acts on the static desktop layout (lg+);
  // the mobile drawer keeps its viewport-relative width.
  const [isLgUp, setIsLgUp] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsLgUp(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const rightDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const onRightResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    rightDragRef.current = { startX: e.clientX, startWidth: rightRailWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  const onRightResizeMove = (e: React.PointerEvent) => {
    if (!rightDragRef.current) return;
    // Dragging left grows the panel, right shrinks it — inverted from the
    // left rail because the handle lives on the aside's inner (left) edge.
    const next = rightDragRef.current.startWidth - (e.clientX - rightDragRef.current.startX);
    setRightRailWidth(next);
  };
  const onRightResizeEnd = (e: React.PointerEvent) => {
    if (!rightDragRef.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    rightDragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

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
            style={isLgUp && !rightRailCollapsed ? { width: `${rightRailWidth}px` } : undefined}
            className={clsx(
              'flex flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
              // Mobile/tablet: slide-over drawer from right
              'fixed inset-y-0 right-0 z-40 w-[88vw] max-w-sm transform transition-transform duration-200 ease-out shadow-xl',
              rightPanelOpen ? 'translate-x-0' : 'translate-x-full',
              // Desktop (lg+): static rail (hidden when collapsed). Width is
              // driven by inline style above so the user can drag-resize it.
              rightRailCollapsed
                ? 'lg:hidden'
                : 'lg:relative lg:translate-x-0 lg:shadow-none lg:flex-shrink-0 lg:max-w-none',
            )}
          >
            {/* Desktop drag-resize handle on the left edge */}
            {!rightRailCollapsed && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize library and P&L sidebar"
                onPointerDown={onRightResizeStart}
                onPointerMove={onRightResizeMove}
                onPointerUp={onRightResizeEnd}
                onPointerCancel={onRightResizeEnd}
                onDoubleClick={() => setRightRailWidth(320)}
                className="hidden lg:block absolute top-0 left-0 h-full w-1.5 -ml-0.5 cursor-col-resize group z-10"
              >
                <div className="absolute inset-y-0 left-0 w-px bg-transparent group-hover:bg-indigo-400 group-active:bg-indigo-500 transition-colors" />
              </div>
            )}
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
