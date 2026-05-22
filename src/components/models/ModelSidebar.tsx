'use client';

import { useState } from 'react';
import {
  useModels,
  useCreateModel,
  useUpdateModel,
  useDeleteModel,
  useDuplicateModel,
} from '@/hooks/useModelsQuery';
import { useModelsStore } from '@/store/modelsStore';
import { CaseType } from '@/types/models';
import { Plus, Copy, Trash2, Pencil, BarChart3, GitCompareArrows } from 'lucide-react';
import clsx from 'clsx';

const CASE_LABELS: Record<CaseType, string> = {
  baseline: 'Baseline',
  best: 'Best case',
  worst: 'Worst case',
  custom: 'Custom',
};

const CASE_TONE: Record<CaseType, string> = {
  baseline: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
  best: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  worst: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  custom: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

export function ModelSidebar() {
  const { data: models = [] } = useModels();
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();
  const duplicateModel = useDuplicateModel();
  const { activeModelId, setActiveModel, compareIds, toggleCompare, clearCompare } = useModelsStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleNew = async (caseType: CaseType = 'baseline') => {
    const model = await createModel.mutateAsync({
      name: caseType === 'baseline' ? 'New model' : CASE_LABELS[caseType],
      caseType,
      horizonMonths: 24,
      startMonth: new Date(),
      startingCash: 0,
      taxPercent: 0,
    });
    setActiveModel(model.id);
    setRenamingId(model.id);
    setRenameValue(model.name);
  };

  const commitRename = (id: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    updateModel.mutate({ id, updates: { name: renameValue.trim() } });
    setRenamingId(null);
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Models</h2>
        </div>
        <button
          onClick={() => handleNew()}
          title="New model"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Case-type quick add */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-1">
        {(['baseline', 'best', 'worst'] as CaseType[]).map((c) => (
          <button
            key={c}
            onClick={() => handleNew(c)}
            className={clsx(
              'text-[10px] px-2 py-0.5 rounded font-medium hover:opacity-80',
              CASE_TONE[c],
            )}
            title={`Add a ${CASE_LABELS[c]} model`}
          >
            + {CASE_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {models.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No models yet</p>
            <button onClick={() => handleNew()} className="mt-2 text-indigo-500 hover:text-indigo-600 text-xs">
              Create your first model
            </button>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {models.map((m) => (
              <div
                key={m.id}
                onClick={() => setActiveModel(m.id)}
                className={clsx(
                  'group flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer',
                  activeModelId === m.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
                )}
              >
                <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-semibold', CASE_TONE[m.caseType])}>
                  {m.caseType === 'baseline' ? 'B' : m.caseType === 'best' ? 'BEST' : m.caseType === 'worst' ? 'WST' : 'C'}
                </span>
                {renamingId === m.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(m.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-1 text-sm bg-white dark:bg-gray-800 border border-indigo-300 rounded"
                  />
                ) : (
                  <span className="flex-1 truncate">{m.name}</span>
                )}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompare(m.id);
                    }}
                    title={compareIds.includes(m.id) ? 'Remove from compare' : 'Add to compare'}
                    className={clsx(
                      'p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700',
                      compareIds.includes(m.id) && 'opacity-100 bg-indigo-100 dark:bg-indigo-900/40',
                    )}
                  >
                    <GitCompareArrows className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(m.id);
                      setRenameValue(m.name);
                    }}
                    title="Rename"
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Pencil className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateModel.mutate({ id: m.id });
                    }}
                    title="Duplicate"
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Copy className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete model "${m.name}"?`)) deleteModel.mutate(m.id);
                    }}
                    title="Delete"
                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {compareIds.length > 0 && (
          <div className="mx-2 mt-3 p-2 rounded bg-indigo-50/60 dark:bg-indigo-900/20 text-[10px] text-indigo-700 dark:text-indigo-200">
            <div className="font-semibold mb-1">{compareIds.length} pinned for compare</div>
            <button
              onClick={clearCompare}
              className="text-indigo-600 hover:text-indigo-700 underline"
            >
              Clear pins
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
