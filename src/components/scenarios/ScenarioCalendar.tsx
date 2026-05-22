'use client';

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
} from 'date-fns';
import { useScenariosStore } from '@/store/scenariosStore';
import { usePlacements, useDeletePlacement } from '@/hooks/useScenariosQuery';
import { computePlacementMetrics, CoursePlacement } from '@/types/scenarios';
import { colorClasses, EventColor } from '@/types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface ScenarioCalendarProps {
  scenarioId: string | null;
}

export function ScenarioCalendar({ scenarioId }: ScenarioCalendarProps) {
  const { currentMonth, goToPreviousMonth, goToNextMonth, goToToday, openPlacementEditor } =
    useScenariosStore();
  const { data: placements = [] } = usePlacements(scenarioId ?? undefined);

  const monthDate = new Date(currentMonth);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Map each day -> placements occupying it (with segment info)
  type Segment = {
    placement: CoursePlacement;
    kind: 'marketing' | 'delivery';
    isStart: boolean;
    isEnd: boolean;
  };
  const segmentsByDay = new Map<string, Segment[]>();
  for (const day of days) {
    segmentsByDay.set(day.toDateString(), []);
  }
  for (const placement of placements) {
    const m = computePlacementMetrics(placement);
    // marketing days
    for (const day of days) {
      const sameMarketing = day >= stripTime(m.marketingStart) && day < stripTime(m.deliveryStart);
      const sameDelivery = day >= stripTime(m.deliveryStart) && day <= stripTime(m.deliveryEnd);
      if (sameMarketing) {
        segmentsByDay.get(day.toDateString())!.push({
          placement,
          kind: 'marketing',
          isStart: isSameDay(day, m.marketingStart),
          isEnd: isSameDay(day, addDays(m.deliveryStart, -1)),
        });
      } else if (sameDelivery) {
        segmentsByDay.get(day.toDateString())!.push({
          placement,
          kind: 'delivery',
          isStart: isSameDay(day, m.deliveryStart),
          isEnd: isSameDay(day, m.deliveryEnd),
        });
      }
    }
  }

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousMonth}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {format(monthDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-xs text-gray-500 px-2 py-1 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center font-medium">{d}</div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-gray-200 dark:bg-gray-800 overflow-auto">
        {days.map((day) => (
          <CalendarDay
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, monthDate)}
            segments={segmentsByDay.get(day.toDateString()) ?? []}
            onClickPlacement={openPlacementEditor}
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
  onClickPlacement,
}: {
  day: Date;
  inMonth: boolean;
  segments: Array<{ placement: CoursePlacement; kind: 'marketing' | 'delivery'; isStart: boolean; isEnd: boolean }>;
  onClickPlacement: (id: string) => void;
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
        'bg-white dark:bg-gray-950 min-h-[100px] p-1 flex flex-col gap-1 transition-colors',
        !inMonth && 'opacity-40',
        isOver && 'ring-2 ring-indigo-400 ring-inset bg-indigo-50 dark:bg-indigo-950/40',
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <span
          className={clsx(
            'font-medium',
            isToday && 'bg-indigo-500 text-white rounded-full w-5 h-5 flex items-center justify-center',
          )}
        >
          {format(day, 'd')}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {segments.map((seg, i) => (
          <PlacementSegment
            key={`${seg.placement.id}-${seg.kind}-${i}`}
            placement={seg.placement}
            kind={seg.kind}
            isStart={seg.isStart}
            isEnd={seg.isEnd}
            onClick={() => onClickPlacement(seg.placement.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PlacementSegment({
  placement,
  kind,
  isStart,
  isEnd,
  onClick,
}: {
  placement: CoursePlacement;
  kind: 'marketing' | 'delivery';
  isStart: boolean;
  isEnd: boolean;
  onClick: () => void;
}) {
  const deletePlacement = useDeletePlacement();
  const template = placement.courseTemplate;
  const color = template
    ? (kind === 'marketing' ? template.marketingColor : template.deliveryColor)
    : ('indigo' as EventColor);
  const cls = colorClasses[color as EventColor] ?? colorClasses.indigo;
  const label = `${kind === 'marketing' ? 'Mkt' : 'Run'}: ${template?.name ?? 'Course'}`;
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        'text-[10px] px-1.5 py-0.5 truncate cursor-pointer group/seg flex items-center gap-1',
        cls.bg,
        'text-white',
        isStart && 'rounded-l',
        isEnd && 'rounded-r',
        kind === 'marketing' && 'opacity-80',
      )}
      title={label}
    >
      {isStart && <span className="truncate flex-1">{label}</span>}
      {!isStart && <span className="opacity-50">·</span>}
      {isStart && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remove "${template?.name}" from this scenario?`)) deletePlacement.mutate(placement.id);
          }}
          className="opacity-0 group-hover/seg:opacity-100 p-0.5 hover:bg-black/20 rounded"
          title="Remove"
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
