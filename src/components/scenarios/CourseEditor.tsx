'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenariosStore } from '@/store/scenariosStore';
import { useCourses, useCreateCourse, useUpdateCourse, useBulkUpdatePlacements } from '@/hooks/useScenariosQuery';
import { CourseTemplate } from '@/types/scenarios';
import { EventColor, colorClasses } from '@/types';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { toast } from '@/components/ui/Toast';

const DEFAULT_FORM: Partial<CourseTemplate> = {
  name: '',
  description: '',
  marketingDurationDays: 14,
  deliveryDurationDays: 7,
  defaultGapDays: 0,
  defaultPricePerChild: 0,
  defaultCostPerRun: 0,
  defaultProjectedRegistrations: 0,
  defaultLikelihoodPercent: 70,
  defaultRisks: '',
  defaultNotes: '',
  marketingColor: 'purple' as EventColor,
  deliveryColor: 'blue' as EventColor,
  isMembership: false,
  billingPeriodDays: 30,
  defaultMonthlyChurnPercent: 5,
  defaultRetentionMonths: 12,
};

const COLOR_OPTIONS: EventColor[] = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

export function CourseEditor() {
  const { isCourseEditorOpen, editingCourseId } = useScenariosStore();
  const { data: courses = [] } = useCourses();
  const editing = courses.find((c) => c.id === editingCourseId) ?? null;

  if (!isCourseEditorOpen) return null;
  return <CourseEditorBody key={editing?.id ?? 'new'} editing={editing} />;
}

function CourseEditorBody({ editing }: { editing: CourseTemplate | null }) {
  const { closeCourseEditor } = useScenariosStore();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const bulkUpdate = useBulkUpdatePlacements();

  const [form, setForm] = useState<Partial<CourseTemplate>>(() =>
    editing ? { ...editing } : { ...DEFAULT_FORM },
  );
  const [propagate, setPropagate] = useState(true);

  const submit = async () => {
    if (!form.name?.trim()) return;
    if (editing) {
      await updateCourse.mutateAsync({ id: editing.id, updates: form });
      // Cascade structural changes (durations, gap, financial defaults) onto existing placements.
      if (propagate) {
        const placementUpdates: Record<string, unknown> = {};
        if (form.marketingDurationDays !== undefined)
          placementUpdates.marketingDurationDays = form.marketingDurationDays;
        if (form.deliveryDurationDays !== undefined)
          placementUpdates.deliveryDurationDays = form.deliveryDurationDays;
        if (form.defaultPricePerChild !== undefined)
          placementUpdates.pricePerChild = form.defaultPricePerChild;
        if (form.defaultCostPerRun !== undefined) placementUpdates.costPerRun = form.defaultCostPerRun;
        if (form.defaultProjectedRegistrations !== undefined)
          placementUpdates.projectedRegistrations = form.defaultProjectedRegistrations;
        if (form.defaultLikelihoodPercent !== undefined)
          placementUpdates.likelihoodPercent = form.defaultLikelihoodPercent;
        if (form.isMembership !== undefined) placementUpdates.isMembership = form.isMembership;
        if (form.defaultMonthlyChurnPercent !== undefined)
          placementUpdates.monthlyChurnPercent = form.defaultMonthlyChurnPercent;
        if (form.defaultRetentionMonths !== undefined)
          placementUpdates.retentionMonths = form.defaultRetentionMonths;
        if (Object.keys(placementUpdates).length > 0) {
          await bulkUpdate.mutateAsync({
            courseTemplateId: editing.id,
            updates: placementUpdates,
          });
          toast.success('Course updated and applied to existing placements');
        } else {
          toast.success('Course updated');
        }
      } else {
        toast.success('Course updated');
      }
    } else {
      await createCourse.mutateAsync(form);
    }
    closeCourseEditor();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
        onClick={closeCourseEditor}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-[600px] max-w-[92vw] max-h-[90vh] overflow-hidden flex flex-col"
        >
          <header className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {editing ? `Edit Course · ${editing.name}` : 'New Course'}
            </h2>
            <button onClick={closeCourseEditor} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </header>

          <div className="p-5 overflow-y-auto space-y-3">
            <Field label="Course name">
              <input
                value={(form.name as string) ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rising Heroes"
                className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                autoFocus
              />
            </Field>

            <Field label="Description">
              <textarea
                value={(form.description as string) ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <DaysField
                label="Marketing duration"
                days={form.marketingDurationDays ?? 0}
                onChange={(d) => setForm({ ...form, marketingDurationDays: d })}
              />
              <DaysField
                label="Gap before delivery"
                days={form.defaultGapDays ?? 0}
                onChange={(d) => setForm({ ...form, defaultGapDays: d })}
                hint="days between marketing end & delivery start"
              />
              <DaysField
                label="Delivery duration"
                days={form.deliveryDurationDays ?? 1}
                onChange={(d) => setForm({ ...form, deliveryDurationDays: d })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Price / child ($)">
                <input
                  type="number"
                  min={0}
                  value={form.defaultPricePerChild ?? 0}
                  onChange={(e) => setForm({ ...form, defaultPricePerChild: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
              <Field label="Cost to run ($)">
                <input
                  type="number"
                  min={0}
                  value={form.defaultCostPerRun ?? 0}
                  onChange={(e) => setForm({ ...form, defaultCostPerRun: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
              <Field label="Projected registrations">
                <input
                  type="number"
                  min={0}
                  value={form.defaultProjectedRegistrations ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, defaultProjectedRegistrations: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
            </div>

            <Field label={`Likelihood (${form.defaultLikelihoodPercent ?? 70}%)`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.defaultLikelihoodPercent ?? 70}
                onChange={(e) => setForm({ ...form, defaultLikelihoodPercent: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Risks">
                <textarea
                  value={(form.defaultRisks as string) ?? ''}
                  onChange={(e) => setForm({ ...form, defaultRisks: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
              <Field label="Key notes">
                <textarea
                  value={(form.defaultNotes as string) ?? ''}
                  onChange={(e) => setForm({ ...form, defaultNotes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ColorPicker
                label="Marketing color"
                value={form.marketingColor as EventColor}
                onChange={(c) => setForm({ ...form, marketingColor: c })}
              />
              <ColorPicker
                label="Delivery color"
                value={form.deliveryColor as EventColor}
                onChange={(c) => setForm({ ...form, deliveryColor: c })}
              />
            </div>

            <div className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.isMembership}
                  onChange={(e) => setForm({ ...form, isMembership: e.target.checked })}
                  className="accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  This is a membership / recurring course
                </span>
              </label>
              {form.isMembership && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <Field label="Billing period (days)">
                    <input
                      type="number"
                      min={1}
                      value={form.billingPeriodDays ?? 30}
                      onChange={(e) => setForm({ ...form, billingPeriodDays: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    />
                  </Field>
                  <Field label="Monthly churn (%)">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={form.defaultMonthlyChurnPercent ?? 5}
                      onChange={(e) => setForm({ ...form, defaultMonthlyChurnPercent: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    />
                  </Field>
                  <Field label="Retention horizon (months)">
                    <input
                      type="number"
                      min={1}
                      value={form.defaultRetentionMonths ?? 12}
                      onChange={(e) => setForm({ ...form, defaultRetentionMonths: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    />
                  </Field>
                </div>
              )}
              {form.isMembership && (
                <p className="text-[10px] text-gray-500 mt-2">
                  Revenue projects as price × initial registrations × (1 − (1 − churn)^N) / churn across the retention horizon.
                </p>
              )}
            </div>

            {editing && (
              <label className="flex items-start gap-2 mt-2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={propagate}
                  onChange={(e) => setPropagate(e.target.checked)}
                  className="mt-0.5 accent-indigo-600"
                />
                <span className="text-xs text-gray-700 dark:text-gray-200">
                  <strong>Apply to existing placements.</strong> Updates durations, price, cost, registrations, likelihood,
                  and membership settings on every placement currently using this course across all scenarios.
                </span>
              </label>
            )}
          </div>

          <footer className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
            <button
              onClick={closeCourseEditor}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              disabled={!form.name?.trim()}
              onClick={submit}
              className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editing ? 'Save' : 'Create course'}
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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

function DaysField({
  label,
  days,
  onChange,
  hint,
}: {
  label: string;
  days: number;
  onChange: (days: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          step={1}
          value={days}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value))))}
          className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
        />
        <span className="text-xs text-gray-500">d</span>
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: EventColor;
  onChange: (c: EventColor) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">{label}</label>
      <div className="flex flex-wrap gap-1">
        {COLOR_OPTIONS.map((c) => {
          const cls = colorClasses[c];
          return (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={clsx(
                'w-5 h-5 rounded-full transition-transform',
                cls.bg,
                value === c && 'ring-2 ring-offset-1 ring-gray-700 dark:ring-white scale-110',
              )}
              title={c}
            />
          );
        })}
      </div>
    </div>
  );
}
