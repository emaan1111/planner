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
import {
  computePlacementMetrics,
  computeRevenue,
  OverrideScope,
  CoursePlacement,
} from '@/types/scenarios';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import clsx from 'clsx';

export function PlacementEditor() {
  const { editingPlacementId, activeScenarioId } = useScenariosStore();
  const { data: placements = [] } = usePlacements(activeScenarioId ?? undefined);
  const placement = placements.find((p) => p.id === editingPlacementId) ?? null;

  if (!placement) return null;
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
    startDate: new Date(placement.startDate),
    deliveryStartDate: new Date(placement.deliveryStartDate),
    risks: placement.risks ?? '',
    notes: placement.notes ?? '',
    isMembership: placement.isMembership,
    monthlyChurnPercent: placement.monthlyChurnPercent,
    retentionMonths: placement.retentionMonths,
    entryMode: placement.entryMode,
    trialDurationDays: placement.trialDurationDays,
    trialToPaidConversionPercent: placement.trialToPaidConversionPercent,
  }));

  const merged = { ...placement, ...form } as CoursePlacement;
  const m = computePlacementMetrics(merged);
  const revenue = computeRevenue(merged);

  const apply = async () => {
    if (scope === 'this-placement') {
      await updatePlacement.mutateAsync({ id: placement.id, updates: form });
      toast.success('Updated this placement');
    } else if (scope === 'all-placements-of-course') {
      await updatePlacement.mutateAsync({ id: placement.id, updates: form });
      await bulkUpdate.mutateAsync({ courseTemplateId: placement.courseTemplateId, updates: form });
      toast.success('Applied to all calendars using this course');
    } else if (scope === 'template-default') {
      await updatePlacement.mutateAsync({ id: placement.id, updates: form });
      const templateUpdates: Record<string, unknown> = {};
      if (form.pricePerChild !== undefined) templateUpdates.defaultPricePerChild = form.pricePerChild;
      if (form.costPerRun !== undefined) templateUpdates.defaultCostPerRun = form.costPerRun;
      if (form.projectedRegistrations !== undefined)
        templateUpdates.defaultProjectedRegistrations = form.projectedRegistrations;
      if (form.likelihoodPercent !== undefined) templateUpdates.defaultLikelihoodPercent = form.likelihoodPercent;
      if (form.marketingDurationDays !== undefined) templateUpdates.marketingDurationDays = form.marketingDurationDays;
      if (form.deliveryDurationDays !== undefined) templateUpdates.deliveryDurationDays = form.deliveryDurationDays;
      if (form.risks !== undefined) templateUpdates.defaultRisks = form.risks;
      if (form.notes !== undefined) templateUpdates.defaultNotes = form.notes;
      if (form.isMembership !== undefined) templateUpdates.isMembership = form.isMembership;
      if (form.monthlyChurnPercent !== undefined) templateUpdates.defaultMonthlyChurnPercent = form.monthlyChurnPercent;
      if (form.retentionMonths !== undefined) templateUpdates.defaultRetentionMonths = form.retentionMonths;
      await updateCourse.mutateAsync({ id: placement.courseTemplateId, updates: templateUpdates });
      toast.success('Saved as the course default');
    }
    closePlacementEditor();
  };

  const courseName = placement.courseTemplate?.name ?? 'Course Placement';

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
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-[680px] max-w-[92vw] max-h-[90vh] overflow-hidden flex flex-col"
        >
          <header className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                {courseName}
                {merged.isMembership && (
                  <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                    Membership
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">
                Marketing {format(m.marketingStart, 'd MMM yyyy')} – {format(addDays(m.marketingEnd, -1), 'd MMM yyyy')} · Delivery {format(m.deliveryStart, 'd MMM yyyy')} – {format(m.deliveryEnd, 'd MMM yyyy')}
              </p>
            </div>
            <button onClick={closePlacementEditor} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </header>

          <div className="p-5 overflow-y-auto space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <Metric label="Revenue" value={`$${revenue.toFixed(0)}`} tone="indigo" />
              <Metric label="Cost" value={`$${m.cost.toFixed(0)}`} tone="rose" />
              <Metric label="Profit" value={`$${m.profit.toFixed(0)}`} tone={m.profit >= 0 ? 'emerald' : 'rose'} />
              <Metric label="EV" value={`$${m.expectedValue.toFixed(0)}`} tone={m.expectedValue >= 0 ? 'emerald' : 'rose'} />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marketing start">
                <input
                  type="date"
                  value={toIsoDate(form.startDate ?? placement.startDate)}
                  onChange={(e) => setForm({ ...form, startDate: new Date(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
              <Field label="Delivery start">
                <input
                  type="date"
                  value={toIsoDate(form.deliveryStartDate ?? placement.deliveryStartDate)}
                  onChange={(e) => setForm({ ...form, deliveryStartDate: new Date(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
            </div>

            {/* Durations in days */}
            <div className="grid grid-cols-2 gap-3">
              <DaysDial
                label="Marketing duration"
                days={form.marketingDurationDays ?? 0}
                onChange={(d) => setForm({ ...form, marketingDurationDays: d })}
              />
              <DaysDial
                label="Delivery duration"
                days={form.deliveryDurationDays ?? 1}
                onChange={(d) => setForm({ ...form, deliveryDurationDays: d })}
              />
            </div>

            {/* Financial dials */}
            <DialSlider
              label="Projected registrations"
              value={form.projectedRegistrations ?? 0}
              min={0}
              max={Math.max(200, (form.projectedRegistrations ?? 0) * 2 + 50)}
              step={1}
              onChange={(v) => setForm({ ...form, projectedRegistrations: v })}
              suffix={merged.isMembership ? ' initial members' : ' kids'}
            />
            <DialSlider
              label={merged.isMembership ? 'Price per member / period' : 'Price per child'}
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

            {/* Membership controls */}
            <div className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.isMembership}
                  onChange={(e) => setForm({ ...form, isMembership: e.target.checked })}
                  className="accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Membership projection</span>
              </label>
              {form.isMembership && (
                <>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <DialSlider
                      label="Monthly churn"
                      value={form.monthlyChurnPercent ?? 5}
                      min={0}
                      max={50}
                      step={0.5}
                      onChange={(v) => setForm({ ...form, monthlyChurnPercent: v })}
                      suffix="%"
                    />
                    <DialSlider
                      label="Retention horizon"
                      value={form.retentionMonths ?? 12}
                      min={1}
                      max={48}
                      step={1}
                      onChange={(v) => setForm({ ...form, retentionMonths: v })}
                      suffix=" mo"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Entry mode</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() =>
                          setForm({
                            ...form,
                            entryMode: 'direct',
                            trialDurationDays: 0,
                            trialToPaidConversionPercent: 100,
                          })
                        }
                        className={clsx(
                          'text-left px-2 py-1.5 rounded border text-xs',
                          form.entryMode !== 'trial-to-paid'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                        )}
                      >
                        <div className="font-semibold">Direct entry</div>
                        <div className="opacity-70 text-[10px]">Sign up & pay immediately</div>
                      </button>
                      <button
                        onClick={() =>
                          setForm({
                            ...form,
                            entryMode: 'trial-to-paid',
                            trialDurationDays: form.trialDurationDays || 14,
                            trialToPaidConversionPercent: form.trialToPaidConversionPercent || 50,
                          })
                        }
                        className={clsx(
                          'text-left px-2 py-1.5 rounded border text-xs',
                          form.entryMode === 'trial-to-paid'
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                        )}
                      >
                        <div className="font-semibold">Trial → paid</div>
                        <div className="opacity-70 text-[10px]">Trial period, then conversion %</div>
                      </button>
                    </div>
                  </div>
                  {form.entryMode === 'trial-to-paid' && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <DialSlider
                        label="Trial duration"
                        value={form.trialDurationDays ?? 14}
                        min={1}
                        max={60}
                        step={1}
                        onChange={(v) => setForm({ ...form, trialDurationDays: v })}
                        suffix=" days"
                      />
                      <DialSlider
                        label="Trial → paid conversion"
                        value={form.trialToPaidConversionPercent ?? 50}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => setForm({ ...form, trialToPaidConversionPercent: v })}
                        suffix="%"
                      />
                    </div>
                  )}
                </>
              )}
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
                  hint="Only this placement"
                />
                <ScopeButton
                  selected={scope === 'all-placements-of-course'}
                  onClick={() => setScope('all-placements-of-course')}
                  label="All calendars w/ this course"
                  hint="Broadcast to every scenario"
                />
                <ScopeButton
                  selected={scope === 'template-default'}
                  onClick={() => setScope('template-default')}
                  label="Course default"
                  hint="Save as template default"
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
              <button onClick={apply} className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">
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
            className="w-24 text-right text-sm font-semibold bg-transparent border-b border-gray-200 dark:border-gray-700 px-1"
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

function DaysDial({
  label,
  days,
  onChange,
}: {
  label: string;
  days: number;
  onChange: (days: number) => void;
}) {
  const sliderMax = Math.max(180, days + 30);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step={1}
            value={days}
            onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value))))}
            className="w-20 text-right text-sm font-semibold bg-transparent border-b border-gray-200 dark:border-gray-700 px-1"
          />
          <span className="text-xs text-gray-500">d</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={sliderMax}
        step={1}
        value={days}
        onChange={(e) => onChange(Math.round(Number(e.target.value)))}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function toIsoDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
