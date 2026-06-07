'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { startOfWeek, endOfWeek, eachDayOfInterval, differenceInCalendarDays, isSameDay, format } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { Task, Project, colorClasses, EventColor } from '@/types';

interface TimelineViewProps {
  projects: Project[];
  tasksByProject: Map<string, Task[]>;
  noProjectTasks: Task[];
  now: Date;
  onEditTask: (task: Task) => void;
}

const DAY_W = 54;
const LABEL_W = 56;
const ROW_H = 60;
const BAR_H = 42;

interface Row {
  task: Task;
  color: EventColor;
  initial: string;
  start: Date;
  end: Date;
}

export function TimelineView({ projects, tasksByProject, noProjectTasks, now, onEditTask }: TimelineViewProps) {
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const push = (task: Task, color: EventColor, label: string) => {
      if (!task.dueDate) return;
      const end = new Date(task.dueDate);
      const created = new Date(task.createdAt);
      out.push({ task, color, initial: (label[0] ?? '•').toUpperCase(), start: created < end ? created : end, end });
    };
    projects.forEach((p) => (tasksByProject.get(p.id) ?? []).forEach((t) => push(t, p.color, p.name)));
    noProjectTasks.forEach((t) => push(t, 'gray', t.title));
    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [projects, tasksByProject, noProjectTasks]);

  const { rangeStart, days } = useMemo(() => {
    const dates: Date[] = [now];
    rows.forEach((r) => dates.push(r.start, r.end));
    const minD = dates.reduce((a, b) => (a < b ? a : b), dates[0]);
    const maxD = dates.reduce((a, b) => (a > b ? a : b), dates[0]);
    const start = startOfWeek(minD, { weekStartsOn: 1 });
    const end = endOfWeek(maxD, { weekStartsOn: 1 });
    return { rangeStart: start, days: eachDayOfInterval({ start, end }) };
  }, [rows, now]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <CalendarRange className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">Add due dates to your tasks to see them on the timeline.</p>
      </div>
    );
  }

  const gridW = days.length * DAY_W;
  const todayX = differenceInCalendarDays(now, rangeStart) * DAY_W + DAY_W / 2;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto shadow-sm">
      <div style={{ width: LABEL_W + gridW }} className="relative">
        {/* Day axis header */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-20">
          <div style={{ width: LABEL_W }} className="flex-shrink-0" />
          <div className="flex relative">
            {days.map((d) => {
              const isToday = isSameDay(d, now);
              const isSunday = d.getDay() === 0;
              return (
                <div key={d.toISOString()} style={{ width: DAY_W }} className="flex-shrink-0 text-center pt-2 pb-1">
                  {isToday ? (
                    <div className="mx-auto w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shadow">
                      {format(d, 'd')}
                    </div>
                  ) : (
                    <div className={clsx('text-sm font-semibold tabular-nums', isSunday ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400')}>
                      {format(d, 'd')}
                    </div>
                  )}
                  <div className="text-[9px] uppercase text-gray-300 dark:text-gray-600 h-3">{isSunday ? 'Sun' : d.getDate() === 1 ? format(d, 'MMM') : ''}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today vertical line spanning the rows */}
        <div
          className="absolute z-10 w-0.5 bg-blue-500"
          style={{ left: LABEL_W + todayX, top: 0, bottom: 0 }}
        />

        {/* Column stripes */}
        <div className="absolute inset-y-0 flex pointer-events-none" style={{ left: LABEL_W }}>
          {days.map((d, i) => (
            <div key={d.toISOString()} style={{ width: DAY_W }} className={clsx('h-full', i % 2 === 0 ? 'bg-gray-50/60 dark:bg-gray-800/20' : 'bg-transparent')} />
          ))}
        </div>

        {/* Rows */}
        <div className="relative">
          {rows.map((row) => {
            const accent = colorClasses[row.color] ?? colorClasses.blue;
            const offset = differenceInCalendarDays(row.start, rangeStart);
            const span = Math.max(1, differenceInCalendarDays(row.end, row.start) + 1);
            return (
              <div key={row.task.id} className="flex items-center" style={{ height: ROW_H }}>
                {/* avatar / project marker */}
                <div style={{ width: LABEL_W }} className="flex-shrink-0 flex items-center justify-center">
                  <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm', accent.bg)}>
                    {row.initial}
                  </div>
                </div>
                {/* track */}
                <div className="relative flex-1" style={{ height: ROW_H }}>
                  <button
                    onClick={() => onEditTask(row.task)}
                    style={{ left: offset * DAY_W + 3, width: span * DAY_W - 6, height: BAR_H, top: (ROW_H - BAR_H) / 2 }}
                    className={clsx(
                      'absolute z-[2] rounded-full pl-4 pr-9 flex items-center text-sm font-bold text-white truncate shadow-md hover:brightness-105 hover:shadow-lg transition-all',
                      accent.bg,
                      row.task.status === 'done' && 'opacity-50'
                    )}
                    title={`${row.task.title} · due ${format(row.end, 'MMM d')}`}
                  >
                    <span className="truncate">{row.task.title}</span>
                    {/* end dot */}
                    <span className="absolute right-2 w-5 h-5 rounded-full bg-white/40 ring-2 ring-white/60" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
