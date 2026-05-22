'use client';

import { useMemo } from 'react';
import {
  useModels,
  useModelLines,
  useModelHeadcount,
  useCreateLine,
  useCreateHeadcount,
  useUpdateModel,
} from '@/hooks/useModelsQuery';
import { usePlacements } from '@/hooks/useScenariosQuery';
import { useModelsStore } from '@/store/modelsStore';
import { useUndoStore } from '@/components/scenarios/ScenarioUndoProvider';
import { computeModel, CaseType, ModelLine } from '@/types/models';
import { LineRow } from './LineRow';
import { HeadcountRow } from './HeadcountRow';
import { ProjectionTable } from './ProjectionTable';
import { TotalsPanel } from './TotalsPanel';
import { ModelCharts } from './ModelCharts';
import { exportModelToCSV, downloadCSV } from './modelExport';
import { Download, Plus, BarChart3 } from 'lucide-react';

export function ModelEditor() {
  const { activeModelId } = useModelsStore();
  const { data: models = [] } = useModels();
  const model = models.find((m) => m.id === activeModelId);
  const { data: lines = [] } = useModelLines(activeModelId ?? undefined);
  const { data: headcount = [] } = useModelHeadcount(activeModelId ?? undefined);
  const updateModel = useUpdateModel();
  const createLine = useCreateLine();
  const createHeadcount = useCreateHeadcount();
  const pushUndo = useUndoStore((s) => s.push);

  // Linked scenarios across this model's lines (best-effort: load placements)
  const linkedScenarioIds = useMemo(
    () => Array.from(new Set(lines.map((l) => l.linkedScenarioId).filter(Boolean) as string[])),
    [lines],
  );

  // Render a tiny invisible probe component per scenario so we can pull its placements.
  // Returns a map { scenarioId -> placements[] }
  // Implementation simplification: use the hook for the first 4 linked scenarios; degrade gracefully beyond.
  const linkedSlots = useMemo(() => linkedScenarioIds.slice(0, 4), [linkedScenarioIds]);
  const placementsByScenario = useScenarioPlacementsBatch(linkedSlots);

  const computed = useMemo(
    () => (model ? computeModel({ model, lines, headcount, placementsByScenario }) : null),
    [model, lines, headcount, placementsByScenario],
  );

  if (!model) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Select or create a model to start.</p>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    if (!computed) return;
    const csv = exportModelToCSV(model, computed, lines, headcount);
    downloadCSV(`${model.name.replace(/\s+/g, '_')}.csv`, csv);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center editor */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Meta */}
        <section className="grid grid-cols-6 gap-2 items-end p-3 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="col-span-2">
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Model</label>
            <input
              value={model.name}
              onChange={(e) => updateModel.mutate({ id: model.id, updates: { name: e.target.value } })}
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Case</label>
            <select
              value={model.caseType}
              onChange={(e) => updateModel.mutate({ id: model.id, updates: { caseType: e.target.value as CaseType } })}
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="baseline">Baseline</option>
              <option value="best">Best</option>
              <option value="worst">Worst</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Horizon (mo)</label>
            <select
              value={model.horizonMonths}
              onChange={(e) => updateModel.mutate({ id: model.id, updates: { horizonMonths: Number(e.target.value) } })}
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {[12, 18, 24, 36, 48].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Start month</label>
            <input
              type="month"
              value={toMonthInput(model.startMonth)}
              onChange={(e) =>
                updateModel.mutate({
                  id: model.id,
                  updates: { startMonth: new Date(`${e.target.value}-01`) },
                })
              }
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Starting cash</label>
            <input
              type="number"
              value={model.startingCash}
              onChange={(e) => updateModel.mutate({ id: model.id, updates: { startingCash: Number(e.target.value) } })}
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Tax % of profit</label>
            <input
              type="number"
              min={0}
              max={100}
              value={model.taxPercent}
              onChange={(e) => updateModel.mutate({ id: model.id, updates: { taxPercent: Number(e.target.value) } })}
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <div className="col-span-3">
            <label className="text-[10px] uppercase tracking-wide text-gray-400">Notes</label>
            <input
              value={model.notes ?? ''}
              onChange={(e) => updateModel.mutate({ id: model.id, updates: { notes: e.target.value } })}
              placeholder="assumptions, sources, links"
              className="w-full px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <button
            onClick={handleExport}
            className="col-span-1 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </section>

        {/* Lines */}
        <section className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <header className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Lines</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  createLine.mutate({
                    modelId: model.id,
                    name: 'New revenue line',
                    kind: 'revenue',
                    inputMode: 'flat',
                    flatAmount: 0,
                    order: lines.length,
                  } as Partial<ModelLine> & { modelId: string })
                }
                className="text-xs px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
              >
                <Plus className="w-3 h-3 inline" /> Revenue
              </button>
              <button
                onClick={() =>
                  createLine.mutate({
                    modelId: model.id,
                    name: 'New cost line',
                    kind: 'cost',
                    inputMode: 'flat',
                    flatAmount: 0,
                    order: lines.length,
                  } as Partial<ModelLine> & { modelId: string })
                }
                className="text-xs px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700"
              >
                <Plus className="w-3 h-3 inline" /> Cost
              </button>
            </div>
          </header>
          <div className="p-2 space-y-1.5">
            {lines.length === 0 && (
              <p className="text-xs text-gray-400 italic p-3 text-center">
                No lines yet. Add a revenue or cost line above.
              </p>
            )}
            {lines.map((l) => (
              <LineRow key={l.id} line={l} horizonMonths={model.horizonMonths} pushUndo={pushUndo} />
            ))}
          </div>
        </section>

        {/* Headcount */}
        <section className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <header className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Headcount</h3>
            <button
              onClick={() =>
                createHeadcount.mutate({
                  modelId: model.id,
                  name: 'New role',
                  annualSalary: 0,
                  startMonth: new Date(model.startMonth),
                  benefitsPercent: 20,
                  order: headcount.length,
                })
              }
              className="text-xs px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
            >
              <Plus className="w-3 h-3 inline" /> Person
            </button>
          </header>
          <div className="p-2 space-y-1.5">
            {headcount.length === 0 && (
              <p className="text-xs text-gray-400 italic p-3 text-center">
                No headcount yet. Add people whose salaries should flow into payroll cost.
              </p>
            )}
            {headcount.map((h) => (
              <HeadcountRow key={h.id} hc={h} pushUndo={pushUndo} />
            ))}
          </div>
        </section>

        {/* Projection table */}
        {computed && (
          <section className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Projection</h3>
            <ProjectionTable computed={computed} lines={lines} headcount={headcount} />
          </section>
        )}
      </div>

      {/* Right rail: totals + charts */}
      <aside className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto p-3 space-y-3">
        {computed && (
          <>
            <TotalsPanel model={model} computed={computed} />
            <ModelCharts computed={computed} />
          </>
        )}
      </aside>
    </div>
  );
}

function toMonthInput(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Hook batch: We need a fixed call order. Pre-bind hooks for up to 4 linked-scenario slots.
import type { CoursePlacement } from '@/types/scenarios';
function useScenarioPlacementsBatch(ids: string[]): Record<string, CoursePlacement[]> {
  const a = usePlacements(ids[0]);
  const b = usePlacements(ids[1]);
  const c = usePlacements(ids[2]);
  const d = usePlacements(ids[3]);
  const map: Record<string, CoursePlacement[]> = {};
  if (ids[0] && a.data) map[ids[0]] = a.data;
  if (ids[1] && b.data) map[ids[1]] = b.data;
  if (ids[2] && c.data) map[ids[2]] = c.data;
  if (ids[3] && d.data) map[ids[3]] = d.data;
  return map;
}
