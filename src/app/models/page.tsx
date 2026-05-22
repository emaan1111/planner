'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ModelSidebar } from '@/components/models/ModelSidebar';
import { ModelEditor } from '@/components/models/ModelEditor';
import { CompareStrip } from '@/components/models/CompareStrip';
import { ScenarioUndoProvider } from '@/components/scenarios/ScenarioUndoProvider';
import { ToastContainer } from '@/components/ui/Toast';

export default function ModelsPage() {
  return (
    <ScenarioUndoProvider>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <header className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">CFO · Financial Models</h1>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <Link href="/scenarios" className="hover:text-gray-700">
              ↳ CFO Scenarios
            </Link>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <ModelSidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <ModelEditor />
            <CompareStrip />
          </main>
        </div>

        <ToastContainer />
      </div>
    </ScenarioUndoProvider>
  );
}
