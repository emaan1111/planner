'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScenariosStore } from '@/store/scenariosStore';
import { useCourses, useCreateCourse, useUpdateCourse } from '@/hooks/useScenariosQuery';
import { CourseTemplate } from '@/types/scenarios';
import { EventColor, colorClasses } from '@/types';
import { X } from 'lucide-react';
import clsx from 'clsx';

const DEFAULT_FORM: Partial<CourseTemplate> = {
  name: '',
  description: '',
  marketingDurationDays: 14,
  deliveryDurationDays: 7,
  defaultPricePerChild: 0,
  defaultCostPerRun: 0,
  defaultProjectedRegistrations: 0,
  defaultLikelihoodPercent: 70,
  defaultRisks: '',
  defaultNotes: '',
  marketingColor: 'purple' as EventColor,
  deliveryColor: 'blue' as EventColor,
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
  // Re-mount whenever the editor opens for a different course, so initial form state derives from props.
  return <CourseEditorBody key={editing?.id ?? 'new'} editing={editing} />;
}

function CourseEditorBody({ editing }: { editing: CourseTemplate | null }) {
  const { closeCourseEditor } = useScenariosStore();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();

  const [form, setForm] = useState<Partial<CourseTemplate>>(() =>
    editing ? { ...editing } : { ...DEFAULT_FORM },
  );

  const submit = async () => {
    if (!form.name?.trim()) return;
    if (editing) {
      await updateCourse.mutateAsync({ id: editing.id, updates: form });
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
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-[560px] max-w-[92vw] max-h-[90vh] overflow-hidden flex flex-col"
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="Marketing duration (days)">
                <input
                  type="number"
                  min={0}
                  value={form.marketingDurationDays ?? 0}
                  onChange={(e) => setForm({ ...form, marketingDurationDays: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
              <Field label="Delivery duration (days)">
                <input
                  type="number"
                  min={1}
                  value={form.deliveryDurationDays ?? 1}
                  onChange={(e) => setForm({ ...form, deliveryDurationDays: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </Field>
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

            <Field label="Likelihood (%)">
              <input
                type="range"
                min={0}
                max={100}
                value={form.defaultLikelihoodPercent ?? 70}
                onChange={(e) => setForm({ ...form, defaultLikelihoodPercent: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <span className="text-xs text-gray-500">{form.defaultLikelihoodPercent ?? 70}%</span>
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
