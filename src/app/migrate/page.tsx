'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface MigrationResults {
  events: { created: number; errors: number };
  tasks: { created: number; errors: number };
  decisions: { created: number; errors: number };
  planTypes: { created: number; errors: number };
  constraints: { created: number; errors: number };
}

export default function MigratePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<MigrationResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localData, setLocalData] = useState<Record<string, unknown> | null>(null);

  const loadLocalStorageData = () => {
    try {
      const stored = localStorage.getItem('planner-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        setLocalData(parsed.state || parsed);
        return parsed.state || parsed;
      }
      return null;
    } catch (e) {
      console.error('Error reading localStorage:', e);
      return null;
    }
  };

  const handleMigrate = async () => {
    setStatus('loading');
    setError(null);

    const data = loadLocalStorageData();
    if (!data) {
      setError('No data found in localStorage');
      setStatus('error');
      return;
    }

    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: data.events || [],
          tasks: data.tasks || [],
          decisions: data.decisions || [],
          planTypes: data.planTypes || [],
          constraints: data.constraints || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Migration failed');
      }

      const result = await response.json();
      setResults(result.results);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Migration failed');
      setStatus('error');
    }
  };

  const handleClearLocalStorage = () => {
    localStorage.removeItem('planner-storage');
    router.push('/');
  };

  // Load data on mount to show preview
  useState(() => {
    if (typeof window !== 'undefined') {
      loadLocalStorageData();
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Migrate to Database
          </h1>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This will migrate your local data (stored in browser localStorage) to the PostgreSQL database.
          After migration, your data will persist across browsers and devices.
        </p>

        {status === 'idle' && (
          <>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Data to migrate:
              </h3>
              {localData ? (
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Events: {Array.isArray((localData as Record<string, unknown>).events) ? ((localData as Record<string, unknown>).events as unknown[]).length : 0}</li>
                  <li>• Tasks: {Array.isArray((localData as Record<string, unknown>).tasks) ? ((localData as Record<string, unknown>).tasks as unknown[]).length : 0}</li>
                  <li>• Decisions: {Array.isArray((localData as Record<string, unknown>).decisions) ? ((localData as Record<string, unknown>).decisions as unknown[]).length : 0}</li>
                  <li>• Plan Types: {Array.isArray((localData as Record<string, unknown>).planTypes) ? ((localData as Record<string, unknown>).planTypes as unknown[]).length : 0}</li>
                  <li>• Constraints: {Array.isArray((localData as Record<string, unknown>).constraints) ? ((localData as Record<string, unknown>).constraints as unknown[]).length : 0}</li>
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Click &quot;Start Migration&quot; to check for data</p>
              )}
            </div>

            <button
              onClick={handleMigrate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Start Migration
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-gray-600 dark:text-gray-400">Migrating data...</span>
          </div>
        )}

        {status === 'success' && results && (
          <>
            <div className="flex items-center gap-2 text-green-500 mb-4">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">Migration Complete!</span>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Results:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Events: {results.events.created} created, {results.events.errors} errors</li>
                <li>• Tasks: {results.tasks.created} created, {results.tasks.errors} errors</li>
                <li>• Decisions: {results.decisions.created} created, {results.decisions.errors} errors</li>
                <li>• Plan Types: {results.planTypes.created} created, {results.planTypes.errors} errors</li>
                <li>• Constraints: {results.constraints.created} created, {results.constraints.errors} errors</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClearLocalStorage}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Clear Local Storage & Go Home
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Go Home (Keep Local)
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertCircle className="w-6 h-6" />
              <span className="font-semibold">Migration Failed</span>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>

            <button
              onClick={() => setStatus('idle')}
              className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
