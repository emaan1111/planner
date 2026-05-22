'use client';

import Link from 'next/link';
import { ArrowLeft, Menu, BarChart3 } from 'lucide-react';
import { ModelSidebar } from '@/components/models/ModelSidebar';
import { ModelEditor } from '@/components/models/ModelEditor';
import { CompareStrip } from '@/components/models/CompareStrip';
import { ScenarioUndoProvider } from '@/components/scenarios/ScenarioUndoProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { useModelsStore } from '@/store/modelsStore';

export default function ModelsPage() {
  const { setSidebarOpen, setRightPanelOpen } = useModelsStore();
  return (
    <ScenarioUndoProvider>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <header className="px-3 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 -ml-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title="Open models list"
            aria-label="Open models list"
          >
            <Menu className="w-5 h-5" />
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
            <span className="hidden sm:inline">CFO · </span>Financial Models
          </h1>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 text-xs text-gray-500">
            <Link href="/scenarios" className="hidden sm:inline hover:text-gray-700">
              ↳ CFO Scenarios
            </Link>
            <button
              onClick={() => setRightPanelOpen(true)}
              className="md:hidden inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Open totals & charts"
              aria-label="Open totals & charts"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Totals</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <ModelSidebar />
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <ModelEditor />
            <CompareStrip />
          </main>
        </div>

        <ToastContainer />
      </div>
    </ScenarioUndoProvider>
  );
}
