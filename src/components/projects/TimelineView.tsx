'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  differenceInCalendarDays,
  isSameDay,
  format,
} from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { Task, Project, colorClasses, EventColor } from '@/types';

interface TimelineViewProps {
  projects: Project[];
  tasksByProject: Map<string, Task[]>;
  noProjectTasks: Task[];
  now: Date;
  onEditTask: (task: Task) => void;
}

const DAY_W = 30; // px per day
const LABEL_W = 160; // px for the project label column

function barRange(task: Task): { start: Date; end: Date } | null {
  if (!task.dueDate) return null;
  const end = new Date(task.dueDate);
  const created = new Date(task.createdAt);
  // Bar runs from when it was created up to its due date (min 1 day).
  const start = created < end ? created : end;
  return { start, end };
}

export function TimelineView({ projects, tasksByProject, noProjectTasks, now, onEditTask }: TimelineViewProps) {
  const rows = useMemo(() => {
    const list: { id: string; name: string; color: EventColor; tasks: Task[] }[] = projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      tasks: (tasksByProject.get(p.id) ?? []).filter((t) => t.dueDate),
    }));
    const orphan = noProjectTasks.filter((t) => t.dueDate);
    if (orphan.length) list.push({ id: '__none__', name: 'No project', color: 'gray', tasks: orphan });
    return list.filter((r) => r.tasks.length > 0);
  }, [projects, tasksByProject, noProjectTasks]);

  const { rangeStart, days } = useMemo(() => {
    const dates: Date[] = [now];
    rows.forEach((r) => r.tasks.forEach((t) => {
      const range = barRange(t);
      if (range) {
        dates.push(range.start, range.end);
      }
    }));
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
        <p className="text-sm">No tasks with due dates yet — add due dates to see them on the timeline.</p>
      </div>
    );
  }

  const gridW = days.length * DAY_W;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
      <div style={{ width: LABEL_W + gridW }}>
        {/* Header: day axis */}
        <div className="flex sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div style={{ width: LABEL_W }} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-gray-500" />
          <div className="flex">
            {days.map((d) => {
              const isToday = isSameDay(d, now);
              const isMonthStart = d.getDate() === 1;
              return (
                <div
                  key={d.toISOString()}
                  style={{ width: DAY_W }}
                  className={clsx(
                    'flex-shrink-0 text-center py-1 border-l border-gray-100 dark:border-gray-800',
                    isToday && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className={clsx('text-[9px] uppercase', isMonthStart ? 'text-gray-500 font-bold' : 'text-gray-300 dark:text-gray-600')}>
                    {isMonthStart || d.getDay() === 1 ? format(d, 'MMM') : ''}
                  </div>
                  <div className={clsx('text-[10px] tabular-nums', isToday ? 'text-blue-600 font-bold' : 'text-gray-500')}>{format(d, 'd')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        {rows.map((row) => {
          const accent = colorClasses[row.color] ?? colorClasses.blue;
          return (
            <div key={row.id} className="flex border-b border-gray-100 dark:border-gray-800">
              <div style={{ width: LABEL_W }} className="flex-shrink-0 flex items-center gap-2 px-3 py-2">
                <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', accent.bg)} />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{row.name}</span>
              </div>
              <div className="relative flex-1" style={{ minHeight: row.tasks.length * 26 + 8 }}>
                {/* today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-400/60 z-0"
                  style={{ left: differenceInCalendarDays(now, rangeStart) * DAY_W + DAY_W / 2 }}
                />
                {row.tasks.map((t, i) => {
                  const range = barRange(t)!;
                  const offset = differenceInCalendarDays(range.start, rangeStart);
                  const span = Math.max(1, differenceInCalendarDays(range.end, range.start) + 1);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onEditTask(t)}
                      style={{ left: offset * DAY_W, width: span * DAY_W - 4, top: i * 26 + 4 }}
                      className={clsx(
                        'absolute h-[22px] rounded-md px-2 flex items-center text-[10px] font-medium text-white truncate shadow-sm hover:brightness-110 transition-all z-[1]',
                        accent.bg,
                        t.status === 'done' && 'opacity-50'
                      )}
                      title={`${t.title} · due ${format(new Date(t.dueDate!), 'MMM d')}`}
                    >
                      {t.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
