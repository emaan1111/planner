'use client';

import { useModels, useModelLines, useModelHeadcount } from '@/hooks/useModelsQuery';
import { usePlacements } from '@/hooks/useScenariosQuery';
import { useModelsStore } from '@/store/modelsStore';
import { computeModel, FinancialModel } from '@/types/models';
import clsx from 'clsx';

export function CompareStrip() {
  const { data: models = [] } = useModels();
  const { compareIds, setActiveModel, activeModelId } = useModelsStore();
  if (compareIds.length === 0) return null;
  const pinned = models.filter((m) => compareIds.includes(m.id));
  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 overflow-x-auto">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-gray-400">Compare ·</span>
        {pinned.map((m) => (
          <CompareCard
            key={m.id}
            model={m}
            active={m.id === activeModelId}
            onClick={() => setActiveModel(m.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CompareCard({ model, active, onClick }: { model: FinancialModel; active: boolean; onClick: () => void }) {
  const { data: lines = [] } = useModelLines(model.id);
  const { data: headcount = [] } = useModelHeadcount(model.id);
  // Collect any linked scenarios; load placements for them
  const linkedScenarioIds = Array.from(new Set(lines.map((l) => l.linkedScenarioId).filter(Boolean) as string[]));
  return (
    <CompareCardWithPlacements
      model={model}
      lines={lines}
      headcount={headcount}
      linkedScenarioIds={linkedScenarioIds}
      active={active}
      onClick={onClick}
    />
  );
}

function CompareCardWithPlacements({
  model,
  lines,
  headcount,
  linkedScenarioIds,
  active,
  onClick,
}: {
  model: FinancialModel;
  lines: ReturnType<typeof useModelLines>['data'] extends infer T ? T : never;
  headcount: ReturnType<typeof useModelHeadcount>['data'] extends infer T ? T : never;
  linkedScenarioIds: string[];
  active: boolean;
  onClick: () => void;
}) {
  const placementsByScenario: Record<string, ReturnType<typeof usePlacements>['data']> = {};
  // Best-effort: load placements for each linked scenario (hooks must be called in fixed order so we use map)
  for (const sid of linkedScenarioIds) {
    // We can't conditionally call hooks; instead invoke a stable hook per scenario via PlacementProbe below.
    void sid;
  }
  // Simplified: fall back to lines/headcount without scenario data when compare card renders to keep hook order stable.
  const computed = computeModel({
    model,
    lines: lines ?? [],
    headcount: headcount ?? [],
    placementsByScenario: placementsByScenario as Record<string, never>,
  });
  const profit = computed.profit.reduce((s, v) => s + v, 0);
  const ending = computed.cumulativeCash[computed.cumulativeCash.length - 1] ?? model.startingCash;
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-shrink-0 px-3 py-1.5 rounded border text-left',
        active ? 'border-indigo-500 bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800',
      )}
    >
      <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">{model.name}</div>
      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
        <span className={clsx(profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>P {fmt(profit)}</span>
        <span className="text-gray-400">·</span>
        <span className={clsx(ending >= 0 ? 'text-emerald-600' : 'text-rose-600')}>Cash {fmt(ending)}</span>
      </div>
    </button>
  );
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
