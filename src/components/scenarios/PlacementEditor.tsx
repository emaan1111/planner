'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenariosStore } from '@/store/scenariosStore';
import {
  usePlacements,
  useUpdatePlacement,
  useUpdateCourse,
  useBulkUpdatePlacements,
  useDeletePlacement,
} from '@/hooks/useScenariosQuery';
import { computePlacementMetrics, OverrideScope, CoursePlacement } from '@/types/scenarios';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import clsx from 'clsx';

export function PlacementEditor() {
  const { editingPlacementId, activeScenarioId } = useScenariosStore();
  const { data: placements = [] } = usePlacements(activeScenarioId ?? undefined);
  const placement = placements.find((p) => p.id === editingPlacementId) ?? null;

  if (!placement) return null;
  // Reset internal state when the focused placement changes by remounting.
  return <PlacementEditorBody key={placement.id} placement={placement} />;
}

function PlacementEditorBody({ placement }: { placement: CoursePlacement }) {
  const { closePlacementEditor } = useScenariosStore();
  const updatePlacement = useUpdatePlacement();
  const updateCourse = useUpdateCourse();
  const bulkUpdate = useBulkUpdatePlacements();
  const deletePlacement = useDeletePlacement();

  const [scope, setScope] = useState<OverrideScope>('this-placement');
  const [form, setForm] = useState<Partial<CoursePlacement>>(() => ({
    pricePerChild: placement.pricePerChild,
    costPerRun: placement.costPerRun,
    projectedRegistrations: placement.projectedRegistrations,
    likelihoodPercent: placement.likelihoodPercent,
    marketingDurationDays: placement.marketingDurationDays,
    deliveryDurationDays: placement.deliveryDurationDays,
    risks: placement.risks ?? '',
    notes: placement.notes ?? '',
  }));

  const m = computePlacementMetrics({ ...placement, ...form } as CoursePlacement);

  const apply = async () => {
    if (!form) return;
    if (scope === 'this-placement') {
      await updatePlacement.mutateAsync({ id: placement.id, updates: form });
      toast.success('Updated this placement');
    } else if (scope === 'all-placements-of-course') {
      // Update this placement first so the editor reflects the new values, then broadcast.
      await updatePlacement.mutateAsync({ id: placement.id, updates: form });
      await bulkUpdate.mutateAsync({
        courseTemplateId: placement.courseTemplateId,
        updates: form,
      });
      toast.success('Applied to all calendars using this course');
    } else if (scope === 'template-default') {
      // Write defaults to the template so future placements pick them up.
      await updatePlacement.mutateAsync({ id: placement.id, updates: form });
      const templateUpdates: Record<string, unknown> = {};
      if (form.pricePerChild !== undefined) templateUpdates.defaultPricePerChild = form.pricePerChild;
      if (form.costPerRun !== undefined) templateUpdates.defaultCostPerRun = form.costPerRun;
      if (form.projectedRegistrations !== undefined)
        templateUpdates.defaultProjectedRegistrations = form.projectedRegistrations;
      if (form.likelihoodPercent !== undefined)
        templateUpdates.defaultLikelihoodPercent = form.likelihoodPercent;
      if (form.marketingDurationDays !== undefined)
        templateUpdates.marketingDurationDays = form.marketingDurationDays;
      if (form.deliveryDurationDays !== undefined)
        templateUpdates.deliveryDurationDays = form.deliveryDurationDays;
      if (form.risks !== undefined) templateUpdates.defaultRisks = form.risks;
      if (form.notes !== undefined) templateUpdates.defaultNotes = form.notes;
      await updateCourse.mutateAsync({ id: placement.courseTemplateId, updates: templateUpdates });
      toast.success('Saved as the course default');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
        onClick={closePlacementEditor}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-[640px] max-w-[92vw] max-h-[90vh] overflow-hidden flex flex-col"
        >
          <header className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                {placement.courseTemplate?.name ?? 'Course Placement'}
              </h2>
              <p className="text-xs text-gray-500">
                Marketing {m.marketingStart.toLocaleDateString()} → {addDays(m.deliveryStart, -1).toLocaleDateString()}{' '}
                · Delivery {m.deliveryStart.toLocaleDateString()} → {m.deliveryEnd.toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={closePlacementEditor}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </header>

          <div className="p-5 overflow-y-auto space-y-4">
            {/* Live metrics */}
            <div className="grid grid-cols-4 gap-2">
              <Metric label="Revenue" value={`$${m.revenue.toFixed(0)}`} tone="indigo" />
              <Metric label="Cost" value={`$${m.cost.toFixed(0)}`} tone="rose" />
              <Metric label="Profit" value={`$${m.profit.toFixed(0)}`} tone={m.profit >= 0 ? 'emerald' : 'rose'} />
              <Metric label="EV" value={`$${m.expectedValue.toFixed(0)}`} tone={m.expectedValue >= 0 ? 'emerald' : 'rose'} />
            </div>

            {/* Dials */}
            <DialSlider
              label="Projected registrations"
              value={form.projectedRegistrations ?? 0}
              min={0}
              max={Math.max(200, (form.projectedRegistrations ?? 0) * 2 + 50)}
              step={1}
              onChange={(v) => setForm({ ...form, projectedRegistrations: v })}
              suffix=" kids"
            />
            <DialSlider
              label="Price per child"
              value={form.pricePerChild ?? 0}
              min={0}
              max={Math.max(500, (form.pricePerChild ?? 0) * 2 + 100)}
              step={1}
              onChange={(v) => setForm({ ...form, pricePerChild: v })}
              prefix="$"
            />
            <DialSlider
              label="Cost to run"
              value={form.costPerRun ?? 0}
              min={0}
              max={Math.max(5000, (form.costPerRun ?? 0) * 2 + 1000)}
              step={10}
              onChange={(v) => setForm({ ...form, costPerRun: v })}
              prefix="$"
            />
            <DialSlider
              label="Likelihood"
              value={form.likelihoodPercent ?? 70}
              min={0}
              max={100}
              step={5}
              onChange={(v) => setForm({ ...form, likelihoodPercent: v })}
              suffix="%"
            />

            <div className="grid grid-cols-2 gap-3">
              <DialSlider
                label="Marketing duration"
                value={form.marketingDurationDays ?? 0}
                min={0}
                max={90}
                step={1}
                onChange={(v) => setForm({ ...form, marketingDurationDays: v })}
                suffix=" days"
              />
              <DialSlider
                label="Delivery duration"
                value={form.deliveryDurationDays ?? 0}
                min={1}
                max={60}
                step={1}
                onChange={(v) => setForm({ ...form, deliveryDurationDays: v })}
                suffix=" days"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" /> Risks
                </label>
                <textarea
                  value={(form.risks as string) ?? ''}
                  onChange={(e) => setForm({ ...form, risks: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Key notes</label>
                <textarea
                  value={(form.notes as string) ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Apply changes to</label>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <ScopeButton
                  selected={scope === 'this-placement'}
                  onClick={() => setScope('this-placement')}
                  label="This scenario only"
                  hint="Updates only this placement"
                />
                <ScopeButton
                  selected={scope === 'all-placements-of-course'}
                  onClick={() => setScope('all-placements-of-course')}
                  label="All calendars w/ this course"
                  hint="Broadcast to every scenario using this course"
                />
                <ScopeButton
                  selected={scope === 'template-default'}
                  onClick={() => setScope('template-default')}
                  label="Course default"
                  hint="Save as the template default for future drops"
                />
              </div>
            </div>
          </div>

          <footer className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm('Remove this placement from the scenario?')) {
                  deletePlacement.mutate(placement.id);
                  closePlacementEditor();
                }
              }}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={closePlacementEditor}
                className="px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={apply}
                className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DialSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
        <div className="flex items-center gap-1">
          {prefix && <span className="text-xs text-gray-500">{prefix}</span>}
          <input
            type="number"
            value={value}
            min={min}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 text-right text-sm font-semibold bg-transparent border-b border-gray-200 dark:border-gray-700 px-1"
          />
          {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  );
}

function ScopeButton({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'text-left px-2 py-1.5 rounded border transition-colors',
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      )}
    >
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[10px] opacity-70">{hint}</div>
    </button>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'indigo' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200',
  };
  return (
    <div className={clsx('rounded p-2', tones[tone])}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
