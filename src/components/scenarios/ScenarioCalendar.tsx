'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  parseISO,
} from 'date-fns';
import { useScenariosStore, ScenarioViewMode } from '@/store/scenariosStore';
import {
  usePlacements,
  useDeletePlacement,
  useScenarioEvents,
  useCreateScenarioEvent,
  useDeleteScenarioEvent,
  useUpdatePlacement,
  useScenarios,
  useUpdateScenario,
} from '@/hooks/useScenariosQuery';
import { useUndoStore } from './ScenarioUndoProvider';
import { computePlacementMetrics, CoursePlacement, ScenarioEvent } from '@/types/scenarios';
import { useCreatePlacement } from '@/hooks/useScenariosQuery';
import { colorClasses, EventColor } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Trash2,
  Plus,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  StickyNote,
} from 'lucide-react';
import clsx from 'clsx';

interface ScenarioCalendarProps {
  scenarioId: string | null;
}

export function ScenarioCalendar({ scenarioId }: ScenarioCalendarProps) {
  const {
    currentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    setCurrentMonth,
    openPlacementEditor,
    viewMode,
    setViewMode,
    customMonths,
    toggleCustomMonth,
    showDelivery,
    toggleDelivery,
    notesPanelOpen,
    setNotesPanelOpen,
  } = useScenariosStore();
  const { data: placements = [] } = usePlacements(scenarioId ?? undefined);
  const { data: scenarioEvents = [] } = useScenarioEvents(scenarioId ?? undefined);
  const { data: scenarios = [] } = useScenarios();
  const activeScenario = scenarios.find((s) => s.id === scenarioId) ?? null;
  const updateScenario = useUpdateScenario();
  const createEvent = useCreateScenarioEvent();

  const [eventDraft, setEventDraft] = useState<{ date: Date } | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Edge-drag resize state
  type ResizeKind = 'marketing' | 'delivery';
  type ResizeState = {
    placementId: string;
    kind: ResizeKind;
    edge: 'start' | 'end';
    current: Date;
  };
  const [resize, setResize] = useState<ResizeState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const placementsRef = useRef<CoursePlacement[]>(placements);
  useEffect(() => {
    resizeRef.current = resize;
  }, [resize]);
  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const updatePlacement = useUpdatePlacement();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      let foundDate: Date | null = null;
      cellRefs.current.forEach((cell, key) => {
        const r = cell.getBoundingClientRect();
        if (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          foundDate = new Date(key);
        }
      });
      if (foundDate) {
        setResize((prev) => (prev ? { ...prev, current: foundDate! } : null));
      }
    };
    const onUp = () => {
      const cur = resizeRef.current;
      if (!cur) return;
      const placement = placementsRef.current.find((p) => p.id === cur.placementId);
      setResize(null);
      if (!placement) return;
      const m = computePlacementMetrics(placement);
      const target = stripTime(cur.current);
      const updates: Partial<CoursePlacement> = {};
      if (cur.kind === 'marketing') {
        if (cur.edge === 'start') {
          const marketingEndExclusive = stripTime(m.marketingEnd);
          const newDur = Math.max(
            1,
            Math.round((marketingEndExclusive.getTime() - target.getTime()) / 86400000),
          );
          updates.startDate = target;
          updates.marketingDurationDays = newDur;
        } else {
          const start = stripTime(m.marketingStart);
          const newDur = Math.max(
            1,
            Math.round((target.getTime() - start.getTime()) / 86400000) + 1,
          );
          updates.marketingDurationDays = newDur;
        }
      } else {
        if (cur.edge === 'start') {
          const deliveryEnd = stripTime(m.deliveryEnd);
          const newDur = Math.max(
            1,
            Math.round((deliveryEnd.getTime() - target.getTime()) / 86400000) + 1,
          );
          updates.deliveryStartDate = target;
          updates.deliveryDurationDays = newDur;
        } else {
          const start = stripTime(m.deliveryStart);
          const newDur = Math.max(
            1,
            Math.round((target.getTime() - start.getTime()) / 86400000) + 1,
          );
          updates.deliveryDurationDays = newDur;
        }
      }
      updatePlacement.mutate({ id: placement.id, updates });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [updatePlacement]);

  const handleResizeStart = (
    placementId: string,
    kind: ResizeKind,
    edge: 'start' | 'end',
    startDate: Date,
  ) => {
    setResize({ placementId, kind, edge, current: startDate });
  };

  const monthDate = new Date(currentMonth);

  if (!scenarioId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Select or create a scenario to start planning.</p>
        </div>
      </div>
    );
  }

  const monthsToRender =
    viewMode === 'month'
      ? 1
      : viewMode === 'three-month'
        ? 3
        : viewMode === 'six-month'
          ? 6
          : viewMode === 'year'
            ? 12
            : 0;

  const monthsToShow: Date[] =
    viewMode === 'custom'
      ? customMonths.map((m) => new Date(m.year, m.month, 1))
      : Array.from({ length: monthsToRender }, (_, i) => addMonths(monthDate, i));

  const handleAddEvent = (date: Date) => {
    if (!scenarioId) return;
    setEventDraft({ date });
  };

  const periodLabel = (() => {
    if (viewMode === 'custom') {
      if (monthsToShow.length === 0) return 'Custom · pick months';
      if (monthsToShow.length === 1) return format(monthsToShow[0], 'MMMM yyyy');
      const first = monthsToShow[0];
      const last = monthsToShow[monthsToShow.length - 1];
      const range = first.getFullYear() === last.getFullYear()
        ? `${format(first, 'MMM')} – ${format(last, 'MMM yyyy')}`
        : `${format(first, 'MMM yyyy')} – ${format(last, 'MMM yyyy')}`;
      return `${range} · ${monthsToShow.length} mo`;
    }
    if (monthsToRender === 1) return format(monthDate, 'MMMM yyyy');
    const last = addMonths(monthDate, monthsToRender - 1);
    if (monthDate.getFullYear() === last.getFullYear()) {
      return `${format(monthDate, 'MMM')} – ${format(last, 'MMM yyyy')}`;
    }
    return `${format(monthDate, 'MMM yyyy')} – ${format(last, 'MMM yyyy')}`;
  })();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-2 sm:px-4 py-2 sm:py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <button
            onClick={goToPreviousMonth}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 sm:min-w-[160px] text-center truncate">
            {periodLabel}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="ml-1 sm:ml-2 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotesPanelOpen(!notesPanelOpen)}
            className={clsx(
              'inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors',
              notesPanelOpen
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300',
            )}
            title={notesPanelOpen ? 'Hide scenario notes' : 'Show scenario notes'}
            aria-pressed={notesPanelOpen}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Notes</span>
            {activeScenario?.notes?.trim() && !notesPanelOpen && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-label="Has notes" />
            )}
          </button>
          <button
            onClick={toggleDelivery}
            className={clsx(
              'inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors',
              showDelivery
                ? 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
            )}
            title={showDelivery ? 'Hide delivery periods' : 'Show delivery periods'}
            aria-pressed={showDelivery}
          >
            {showDelivery ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Delivery</span>
          </button>
          {viewMode === 'custom' && (
            <button
              onClick={() => setIsPickerOpen(true)}
              className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              title="Pick months to show"
            >
              {customMonths.length === 0
                ? 'Pick months'
                : `${customMonths.length} month${customMonths.length === 1 ? '' : 's'}`}
            </button>
          )}
          <ViewModeSwitcher
            mode={viewMode}
            onChange={(m) => {
              setViewMode(m);
              if (m === 'custom' && customMonths.length === 0) setIsPickerOpen(true);
            }}
          />
        </div>
      </div>

      {notesPanelOpen && activeScenario && (
        <ScenarioNotesPanel
          key={activeScenario.id}
          scenarioName={activeScenario.name}
          initialNotes={activeScenario.notes ?? ''}
          onSave={(notes) =>
            updateScenario.mutate({ id: activeScenario.id, updates: { notes } })
          }
          onClose={() => setNotesPanelOpen(false)}
        />
      )}

      {/* Days-of-week header (only meaningful for single month view; others stack their own) */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-7 text-xs text-gray-500 px-2 py-1 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center font-medium">
              {d}
            </div>
          ))}
        </div>
      )}

      <div
        className={clsx(
          'flex-1 overflow-auto bg-gray-50 dark:bg-gray-950',
          viewMode === 'month' && 'p-0',
          viewMode === 'three-month' && 'p-2 sm:p-3 grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3',
          viewMode === 'six-month' && 'p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3',
          viewMode === 'year' && 'p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3',
          viewMode === 'custom' && 'p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3',
        )}
      >
        {viewMode === 'custom' && monthsToShow.length === 0 ? (
          <div className="col-span-full text-center text-sm text-gray-400 py-12">
            <p className="mb-3">No months selected.</p>
            <button
              onClick={() => setIsPickerOpen(true)}
              className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Pick months
            </button>
          </div>
        ) : (
          monthsToShow.map((d) => (
            <MonthGrid
              key={`${d.getFullYear()}-${d.getMonth()}`}
              monthDate={d}
              placements={placements}
              scenarioEvents={scenarioEvents}
              compact={viewMode !== 'month'}
              showDelivery={showDelivery}
              onClickMonthLabel={(target) => {
                setCurrentMonth(target);
                setViewMode('month');
              }}
              onClickPlacement={openPlacementEditor}
              onAddEvent={handleAddEvent}
              cellRefs={cellRefs}
              resize={resize}
              onResizeStart={handleResizeStart}
            />
          ))
        )}
      </div>

      {isPickerOpen && (
        <CustomMonthPicker
          anchorYear={monthDate.getFullYear()}
          selected={customMonths}
          onToggle={toggleCustomMonth}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {eventDraft && scenarioId && (
        <NewEventDialog
          initialDate={eventDraft.date}
          onClose={() => setEventDraft(null)}
          onSubmit={(data) => {
            createEvent.mutate({
              scenarioId,
              title: data.title,
              startDate: data.startDate,
              endDate: data.endDate,
              kind: data.kind,
              color: data.color,
              notes: data.notes || undefined,
            });
            setEventDraft(null);
          }}
        />
      )}
    </div>
  );
}

const EVENT_COLORS: EventColor[] = ['amber', 'red', 'orange', 'yellow', 'green', 'teal', 'sky', 'blue', 'indigo', 'violet', 'purple', 'pink'];
const EVENT_KINDS: { id: ScenarioEvent['kind']; label: string; icon: string }[] = [
  { id: 'note', label: 'Note', icon: '📌' },
  { id: 'holiday', label: 'Holiday', icon: '🌴' },
  { id: 'milestone', label: 'Milestone', icon: '🏁' },
];

function NewEventDialog({
  initialDate,
  onClose,
  onSubmit,
}: {
  initialDate: Date;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    startDate: Date;
    endDate: Date;
    kind: ScenarioEvent['kind'];
    color: EventColor;
    notes: string;
  }) => void;
}) {
  const initial = format(initialDate, 'yyyy-MM-dd');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initial);
  const [endDate, setEndDate] = useState(initial);
  const [singleDay, setSingleDay] = useState(true);
  const [kind, setKind] = useState<ScenarioEvent['kind']>('note');
  const [color, setColor] = useState<EventColor>('amber');
  const [notes, setNotes] = useState('');

  const canSubmit = title.trim().length > 0 && startDate && (singleDay || endDate >= startDate);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      startDate: parseISO(startDate),
      endDate: parseISO(singleDay ? startDate : endDate),
      kind,
      color,
      notes,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Add event</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </header>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">Title</label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) submit();
              }}
              placeholder="e.g. Eid, school holiday, key reminder"
              className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={singleDay}
              onChange={(e) => {
                const s = e.target.checked;
                setSingleDay(s);
                if (s) setEndDate(startDate);
              }}
              className="accent-indigo-600"
            />
            Single-day event
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">
                {singleDay ? 'Date' : 'Start date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (singleDay || e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            {!singleDay && (
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">Kind</label>
            <div className="flex gap-1">
              {EVENT_KINDS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={clsx(
                    'flex-1 px-2 py-1.5 rounded text-xs border transition-colors',
                    kind === k.id
                      ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-400 text-indigo-700 dark:text-indigo-200'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                >
                  <span className="mr-1">{k.icon}</span>{k.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">Color</label>
            <div className="flex flex-wrap gap-1">
              {EVENT_COLORS.map((c) => {
                const cls = colorClasses[c] ?? colorClasses.amber;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={clsx(
                      'w-6 h-6 rounded-full transition-transform',
                      cls.bg,
                      color === c && 'ring-2 ring-offset-1 ring-gray-700 dark:ring-white scale-110',
                    )}
                    title={c}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        </div>
        <footer className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add event
          </button>
        </footer>
      </div>
    </div>
  );
}

function ScenarioNotesPanel({
  scenarioName,
  initialNotes,
  onSave,
  onClose,
}: {
  scenarioName: string;
  initialNotes: string;
  onSave: (notes: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialNotes);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const lastSavedRef = useRef(initialNotes);

  useEffect(() => {
    if (value === lastSavedRef.current) return;
    const t = setTimeout(() => {
      onSave(value);
      lastSavedRef.current = value;
      setSavedAt(new Date());
    }, 600);
    return () => clearTimeout(t);
  }, [value, onSave]);

  return (
    <div className="px-2 sm:px-4 py-2 border-b border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/10">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1">
          <StickyNote className="w-3.5 h-3.5" />
          Notes — <span className="font-normal text-amber-700/80 dark:text-amber-200/70 truncate max-w-[40ch]">{scenarioName}</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-amber-700/70 dark:text-amber-200/60">
            {value === lastSavedRef.current && savedAt
              ? `Saved ${format(savedAt, 'HH:mm:ss')}`
              : value !== lastSavedRef.current
                ? 'Saving…'
                : 'Auto-saves'}
          </span>
          <button
            onClick={onClose}
            className="text-xs text-amber-700 dark:text-amber-200 hover:underline"
            aria-label="Hide notes"
          >
            Hide
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Assumptions, decisions, things to revisit…"
        className="w-full px-2 py-1.5 rounded border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
    </div>
  );
}

function ViewModeSwitcher({ mode, onChange }: { mode: ScenarioViewMode; onChange: (m: ScenarioViewMode) => void }) {
  const items: { id: ScenarioViewMode; label: string }[] = [
    { id: 'month', label: 'Month' },
    { id: 'three-month', label: '3 mo' },
    { id: 'six-month', label: '6 mo' },
    { id: 'year', label: 'Year' },
    { id: 'custom', label: 'Custom' },
  ];
  return (
    <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded p-0.5">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={clsx(
            'text-xs px-2 py-1 rounded transition-colors',
            mode === it.id
              ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

type ResizeKind = 'marketing' | 'delivery';
type ResizePreview = {
  placementId: string;
  kind: ResizeKind;
  edge: 'start' | 'end';
  current: Date;
} | null;

interface MonthGridProps {
  monthDate: Date;
  placements: CoursePlacement[];
  scenarioEvents: ScenarioEvent[];
  compact: boolean;
  showDelivery: boolean;
  onClickMonthLabel: (date: Date) => void;
  onClickPlacement: (id: string) => void;
  onAddEvent: (date: Date) => void;
  cellRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  resize: ResizePreview;
  onResizeStart: (placementId: string, kind: ResizeKind, edge: 'start' | 'end', startDate: Date) => void;
}

function MonthGrid({
  monthDate,
  placements,
  scenarioEvents,
  compact,
  showDelivery,
  onClickMonthLabel,
  onClickPlacement,
  onAddEvent,
  cellRefs,
  resize,
  onResizeStart,
}: MonthGridProps) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  type PlacementSegment = {
    type: 'placement';
    placement: CoursePlacement;
    kind: 'marketing' | 'delivery';
    isStart: boolean;
    isEnd: boolean;
  };
  type EventSegment = {
    type: 'event';
    event: ScenarioEvent;
    isStart: boolean;
    isEnd: boolean;
  };
  type DaySegment = PlacementSegment | EventSegment;

  const segmentsByDay = new Map<string, DaySegment[]>();
  for (const day of days) segmentsByDay.set(day.toDateString(), []);

  for (const placement of placements) {
    const m = computePlacementMetrics(placement);
    let marketingStart = stripTime(m.marketingStart);
    let marketingEndExclusive = stripTime(m.marketingEnd);
    let deliveryStart = stripTime(m.deliveryStart);
    let deliveryEndInclusive = stripTime(m.deliveryEnd);
    if (resize && resize.placementId === placement.id) {
      const target = stripTime(resize.current);
      if (resize.kind === 'marketing' && resize.edge === 'start') marketingStart = target;
      else if (resize.kind === 'marketing' && resize.edge === 'end') marketingEndExclusive = addDays(target, 1);
      else if (resize.kind === 'delivery' && resize.edge === 'start') deliveryStart = target;
      else if (resize.kind === 'delivery' && resize.edge === 'end') deliveryEndInclusive = target;
      // clamp so previews stay valid
      if (marketingEndExclusive <= marketingStart) marketingEndExclusive = addDays(marketingStart, 1);
      if (deliveryEndInclusive < deliveryStart) deliveryEndInclusive = deliveryStart;
    }
    for (const day of days) {
      const stripped = stripTime(day);
      if (stripped >= marketingStart && stripped < marketingEndExclusive) {
        segmentsByDay.get(day.toDateString())!.push({
          type: 'placement',
          placement,
          kind: 'marketing',
          isStart: isSameDay(stripped, marketingStart),
          isEnd: isSameDay(stripped, addDays(marketingEndExclusive, -1)),
        });
      } else if (showDelivery && stripped >= deliveryStart && stripped <= deliveryEndInclusive) {
        segmentsByDay.get(day.toDateString())!.push({
          type: 'placement',
          placement,
          kind: 'delivery',
          isStart: isSameDay(stripped, deliveryStart),
          isEnd: isSameDay(stripped, deliveryEndInclusive),
        });
      }
    }
  }

  for (const event of scenarioEvents) {
    const startStripped = stripTime(new Date(event.startDate));
    const endStripped = stripTime(new Date(event.endDate));
    for (const day of days) {
      const stripped = stripTime(day);
      if (stripped >= startStripped && stripped <= endStripped) {
        segmentsByDay.get(day.toDateString())!.push({
          type: 'event',
          event,
          isStart: isSameDay(stripped, startStripped),
          isEnd: isSameDay(stripped, endStripped),
        });
      }
    }
  }

  return (
    <div className={clsx('bg-white dark:bg-gray-900 flex flex-col', compact && 'rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden')}>
      {compact && (
        <button
          onClick={() => onClickMonthLabel(monthStart)}
          className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-left px-2 py-1.5 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {format(monthDate, 'MMMM yyyy')}
        </button>
      )}
      {compact && (
        <div className="grid grid-cols-7 text-[10px] text-gray-400 px-1 py-0.5 border-b border-gray-100 dark:border-gray-800">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center">
              {d}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-7 grid-rows-6 gap-px bg-gray-200 dark:bg-gray-800 flex-1">
        {days.map((day) => (
          <CalendarDay
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, monthDate)}
            segments={segmentsByDay.get(day.toDateString()) ?? []}
            compact={compact}
            onClickPlacement={onClickPlacement}
            onAddEvent={onAddEvent}
            cellRefs={cellRefs}
            onResizeStart={onResizeStart}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarDay({
  day,
  inMonth,
  segments,
  compact,
  onClickPlacement,
  onAddEvent,
  cellRefs,
  onResizeStart,
}: {
  day: Date;
  inMonth: boolean;
  segments: Array<
    | { type: 'placement'; placement: CoursePlacement; kind: 'marketing' | 'delivery'; isStart: boolean; isEnd: boolean }
    | { type: 'event'; event: ScenarioEvent; isStart: boolean; isEnd: boolean }
  >;
  compact: boolean;
  onClickPlacement: (id: string) => void;
  onAddEvent: (date: Date) => void;
  cellRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onResizeStart: (placementId: string, kind: 'marketing' | 'delivery', edge: 'start' | 'end', startDate: Date) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `scenario-day-${day.toISOString()}`,
    data: { date: day, type: 'scenario-day' },
  });
  const isToday = isSameDay(day, new Date());

  const dayKey = day.toISOString();
  const setRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    if (el) cellRefs.current.set(dayKey, el);
    else cellRefs.current.delete(dayKey);
  };

  return (
    <div
      ref={setRefs}
      className={clsx(
        'bg-white dark:bg-gray-950 flex flex-col gap-1 transition-colors group',
        compact ? 'min-h-[42px] p-0.5' : 'min-h-[64px] sm:min-h-[100px] p-1',
        !inMonth && 'opacity-40',
        isOver && 'ring-2 ring-indigo-400 ring-inset bg-indigo-50 dark:bg-indigo-950/40',
      )}
    >
      <div className={clsx('flex items-center justify-between', compact ? 'text-[10px]' : 'text-xs')}>
        <span
          className={clsx(
            'font-medium',
            isToday && (compact ? 'bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]' : 'bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center'),
          )}
        >
          {format(day, 'd')}
        </span>
        {!compact && inMonth && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddEvent(day);
            }}
            title="Add event / note"
            aria-label="Add event"
            className="md:opacity-0 md:group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {segments.map((seg, i) => {
          if (seg.type === 'placement') {
            return (
              <PlacementSegment
                key={`${seg.placement.id}-${seg.kind}-${i}`}
                placement={seg.placement}
                kind={seg.kind}
                isStart={seg.isStart}
                isEnd={seg.isEnd}
                compact={compact}
                day={day}
                onClick={() => onClickPlacement(seg.placement.id)}
                onResizeStart={onResizeStart}
              />
            );
          }
          return (
            <EventSegmentBlock
              key={`${seg.event.id}-${i}`}
              event={seg.event}
              isStart={seg.isStart}
              isEnd={seg.isEnd}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlacementSegment({
  placement,
  kind,
  isStart,
  isEnd,
  compact,
  day,
  onClick,
  onResizeStart,
}: {
  placement: CoursePlacement;
  kind: 'marketing' | 'delivery';
  isStart: boolean;
  isEnd: boolean;
  compact: boolean;
  day: Date;
  onClick: () => void;
  onResizeStart: (placementId: string, kind: 'marketing' | 'delivery', edge: 'start' | 'end', startDate: Date) => void;
}) {
  const deletePlacement = useDeletePlacement();
  const createPlacement = useCreatePlacement();
  const pushUndo = useUndoStore((s) => s.push);
  const template = placement.courseTemplate;
  const color = template
    ? kind === 'marketing'
      ? template.marketingColor
      : template.deliveryColor
    : ('indigo' as EventColor);
  const cls = colorClasses[color as EventColor] ?? colorClasses.indigo;
  const courseName = template?.name ?? 'Course';
  const isMarketing = kind === 'marketing';
  const missingFields: string[] = [];
  if ((placement.costPerRun ?? 0) <= 0) missingFields.push('cost per run');
  if ((placement.projectedRegistrations ?? 0) <= 0) missingFields.push('projected registrations');
  if ((placement.pricePerChild ?? 0) <= 0) missingFields.push('price per child');
  const isIncomplete = missingFields.length > 0;
  const missingList = missingFields.join(', ');
  const incompleteHint = isIncomplete ? ` — missing: ${missingList} (no projection)` : '';
  const warningLabel = isIncomplete ? `Missing: ${missingList}` : '';
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'relative truncate cursor-pointer group/seg flex items-center gap-1',
        compact ? 'text-[8px] px-1 py-px' : 'text-[10px] px-1.5 py-0.5',
        isMarketing
          ? clsx(cls.bg, 'text-white font-semibold border-y border-y-black/20 shadow-sm')
          : clsx(cls.light, cls.text, 'border', cls.border, 'border-dashed opacity-90'),
        isStart && 'rounded-l',
        isEnd && 'rounded-r',
      )}
      title={`${isMarketing ? 'Marketing' : 'Delivery'} – ${courseName}${incompleteHint}`}
    >
      {isStart && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(placement.id, kind, 'start', day);
          }}
          className={clsx(
            'absolute left-0 top-0 bottom-0 cursor-ew-resize z-10',
            compact ? 'w-1' : 'w-1.5',
            'opacity-0 group-hover/seg:opacity-100',
            isMarketing ? 'bg-black/30' : 'bg-gray-500/40',
            'rounded-l',
          )}
          title="Drag to resize start"
        />
      )}
      {isEnd && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(placement.id, kind, 'end', day);
          }}
          className={clsx(
            'absolute right-0 top-0 bottom-0 cursor-ew-resize z-10',
            compact ? 'w-1' : 'w-1.5',
            'opacity-0 group-hover/seg:opacity-100',
            isMarketing ? 'bg-black/30' : 'bg-gray-500/40',
            'rounded-r',
          )}
          title="Drag to resize end"
        />
      )}
      {isMarketing && isStart && (
        <span
          className={clsx(
            'inline-flex items-center font-bold tracking-wide bg-black/25 rounded',
            compact ? 'text-[7px] px-0.5' : 'text-[8px] px-1 py-px',
          )}
        >
          MKT
        </span>
      )}
      <span className="truncate flex-1">
        {isMarketing ? `📣 ${courseName}` : `▶ ${courseName}`}
      </span>
      {isIncomplete && isStart && (
        <AlertTriangle
          className={clsx(
            'flex-shrink-0 text-red-500 drop-shadow',
            compact ? 'w-2 h-2' : 'w-3 h-3',
            isMarketing && 'text-yellow-300',
          )}
          aria-label={warningLabel}
        >
          <title>{warningLabel}</title>
        </AlertTriangle>
      )}
      {isStart && !compact && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            (e.currentTarget as HTMLButtonElement).blur();
            (document.activeElement as HTMLElement | null)?.blur?.();
            // Capture snapshot for undo before deleting
            const snapshot = { ...placement };
            pushUndo({
              label: `Remove ${courseName}`,
              undo: async () => {
                await createPlacement.mutateAsync({
                  scenarioId: snapshot.scenarioId,
                  courseTemplateId: snapshot.courseTemplateId,
                  startDate: new Date(snapshot.startDate),
                  deliveryStartDate: new Date(snapshot.deliveryStartDate),
                  marketingDurationDays: snapshot.marketingDurationDays,
                  deliveryDurationDays: snapshot.deliveryDurationDays,
                  pricePerChild: snapshot.pricePerChild,
                  costPerRun: snapshot.costPerRun,
                  projectedRegistrations: snapshot.projectedRegistrations,
                  likelihoodPercent: snapshot.likelihoodPercent,
                  risks: snapshot.risks,
                  notes: snapshot.notes,
                  isMembership: snapshot.isMembership,
                  monthlyChurnPercent: snapshot.monthlyChurnPercent,
                  retentionMonths: snapshot.retentionMonths,
                  entryMode: snapshot.entryMode,
                  trialDurationDays: snapshot.trialDurationDays,
                  trialToPaidConversionPercent: snapshot.trialToPaidConversionPercent,
                });
              },
            });
            deletePlacement.mutate(placement.id);
          }}
          className="opacity-0 group-hover/seg:opacity-100 p-0.5 hover:bg-black/20 rounded"
          title="Remove (cmd+Z to undo)"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

function EventSegmentBlock({
  event,
  isStart,
  isEnd,
  compact,
}: {
  event: ScenarioEvent;
  isStart: boolean;
  isEnd: boolean;
  compact: boolean;
}) {
  const deleteEvent = useDeleteScenarioEvent();
  const createEvent = useCreateScenarioEvent();
  const pushUndo = useUndoStore((s) => s.push);
  const cls = colorClasses[event.color as EventColor] ?? colorClasses.amber;
  const icon = event.kind === 'holiday' ? '🌴' : event.kind === 'milestone' ? '🏁' : '📌';
  return (
    <div
      className={clsx(
        'truncate group/evt flex items-center gap-1 border',
        compact ? 'text-[8px] px-1 py-px' : 'text-[10px] px-1.5 py-0.5',
        cls.light,
        cls.text,
        cls.border,
        isStart && 'rounded-l',
        isEnd && 'rounded-r',
      )}
      title={`${event.title}${event.notes ? '\n' + event.notes : ''}`}
    >
      <span className="truncate flex-1">
        {icon} {event.title}
      </span>
      {isStart && !compact && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            (e.currentTarget as HTMLButtonElement).blur();
            (document.activeElement as HTMLElement | null)?.blur?.();
            const snapshot = { ...event };
            pushUndo({
              label: `Remove ${event.title}`,
              undo: async () => {
                await createEvent.mutateAsync({
                  scenarioId: snapshot.scenarioId,
                  title: snapshot.title,
                  startDate: new Date(snapshot.startDate),
                  endDate: new Date(snapshot.endDate),
                  color: snapshot.color,
                  kind: snapshot.kind,
                  notes: snapshot.notes,
                });
              },
            });
            deleteEvent.mutate(event.id);
          }}
          className="opacity-0 group-hover/evt:opacity-100 p-0.5 hover:bg-black/10 rounded"
          title="Remove (cmd+Z to undo)"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

function CustomMonthPicker({
  anchorYear,
  selected,
  onToggle,
  onClose,
}: {
  anchorYear: number;
  selected: { year: number; month: number }[];
  onToggle: (year: number, month: number) => void;
  onClose: () => void;
}) {
  const [year, setYear] = useState(anchorYear);
  const isSelected = (y: number, m: number) =>
    selected.some((s) => s.year === y && s.month === m);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Pick months to show
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </header>
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            aria-label="Previous year"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            aria-label="Next year"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, m) => {
            const active = isSelected(year, m);
            return (
              <button
                key={m}
                onClick={() => onToggle(year, m)}
                className={clsx(
                  'px-2 py-2 text-xs rounded border flex items-center justify-center gap-1 transition-colors',
                  active
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200',
                )}
              >
                {active && <Check className="w-3 h-3" />}
                {format(new Date(year, m, 1), 'MMM')}
              </button>
            );
          })}
        </div>
        <footer className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {selected.length} month{selected.length === 1 ? '' : 's'} selected
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
