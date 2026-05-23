'use client';

import { useState, useMemo } from 'react';
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
import { useScenariosStore } from '@/store/scenariosStore';
import {
  usePlacements,
  useDeletePlacement,
  useScenarioEvents,
  useCreateScenarioEvent,
  useDeleteScenarioEvent,
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
} from 'lucide-react';
import clsx from 'clsx';

type ScenarioViewMode = 'month' | 'three-month' | 'six-month' | 'year';

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
  } = useScenariosStore();
  const { data: placements = [] } = usePlacements(scenarioId ?? undefined);
  const { data: scenarioEvents = [] } = useScenarioEvents(scenarioId ?? undefined);
  const createEvent = useCreateScenarioEvent();

  const [viewMode, setViewMode] = useState<ScenarioViewMode>('month');
  const [eventDraft, setEventDraft] = useState<{ date: Date } | null>(null);

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
    viewMode === 'month' ? 1 : viewMode === 'three-month' ? 3 : viewMode === 'six-month' ? 6 : 12;

  const monthOffsets = Array.from({ length: monthsToRender }, (_, i) => i);

  const handleAddEvent = (date: Date) => {
    if (!scenarioId) return;
    setEventDraft({ date });
  };

  const periodLabel = (() => {
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

        <ViewModeSwitcher mode={viewMode} onChange={setViewMode} />
      </div>

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
        )}
      >
        {monthOffsets.map((offset) => (
          <MonthGrid
            key={offset}
            monthDate={addMonths(monthDate, offset)}
            placements={placements}
            scenarioEvents={scenarioEvents}
            compact={viewMode !== 'month'}
            onClickMonthLabel={(d) => {
              setCurrentMonth(d);
              setViewMode('month');
            }}
            onClickPlacement={openPlacementEditor}
            onAddEvent={handleAddEvent}
          />
        ))}
      </div>

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

function ViewModeSwitcher({ mode, onChange }: { mode: ScenarioViewMode; onChange: (m: ScenarioViewMode) => void }) {
  const items: { id: ScenarioViewMode; label: string }[] = [
    { id: 'month', label: 'Month' },
    { id: 'three-month', label: '3 mo' },
    { id: 'six-month', label: '6 mo' },
    { id: 'year', label: 'Year' },
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

interface MonthGridProps {
  monthDate: Date;
  placements: CoursePlacement[];
  scenarioEvents: ScenarioEvent[];
  compact: boolean;
  onClickMonthLabel: (date: Date) => void;
  onClickPlacement: (id: string) => void;
  onAddEvent: (date: Date) => void;
}

function MonthGrid({
  monthDate,
  placements,
  scenarioEvents,
  compact,
  onClickMonthLabel,
  onClickPlacement,
  onAddEvent,
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
    const marketingStart = stripTime(m.marketingStart);
    const marketingEndExclusive = stripTime(m.marketingEnd);
    const deliveryStart = stripTime(m.deliveryStart);
    const deliveryEndInclusive = stripTime(m.deliveryEnd);
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
      } else if (stripped >= deliveryStart && stripped <= deliveryEndInclusive) {
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
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `scenario-day-${day.toISOString()}`,
    data: { date: day, type: 'scenario-day' },
  });
  const isToday = isSameDay(day, new Date());

  return (
    <div
      ref={setNodeRef}
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
                onClick={() => onClickPlacement(seg.placement.id)}
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
  onClick,
}: {
  placement: CoursePlacement;
  kind: 'marketing' | 'delivery';
  isStart: boolean;
  isEnd: boolean;
  compact: boolean;
  onClick: () => void;
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
  const isIncomplete =
    (placement.costPerRun ?? 0) <= 0 || (placement.projectedRegistrations ?? 0) <= 0;
  const missingFields: string[] = [];
  if ((placement.costPerRun ?? 0) <= 0) missingFields.push('cost');
  if ((placement.projectedRegistrations ?? 0) <= 0) missingFields.push('registrations');
  const incompleteHint = isIncomplete
    ? ` — incomplete: missing ${missingFields.join(' & ')} (no projection)`
    : '';
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'truncate cursor-pointer group/seg flex items-center gap-1',
        compact ? 'text-[8px] px-1 py-px' : 'text-[10px] px-1.5 py-0.5',
        isMarketing
          ? clsx(cls.bg, 'text-white font-semibold border-y border-y-black/20 shadow-sm')
          : clsx(cls.light, cls.text, 'border', cls.border, 'border-dashed opacity-90'),
        isStart && 'rounded-l',
        isEnd && 'rounded-r',
      )}
      title={`${isMarketing ? 'Marketing' : 'Delivery'} – ${courseName}${incompleteHint}`}
    >
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
          aria-label="Missing cost or projected registrations"
        />
      )}
      {isStart && !compact && (
        <button
          onClick={(e) => {
            e.stopPropagation();
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

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
