'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import { startOfWeek, endOfWeek, eachDayOfInterval, differenceInCalendarDays, addDays, isSameDay, format } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { Task, Project, colorClasses, EventColor } from '@/types';

interface TimelineViewProps {
  projects: Project[];
  tasksByProject: Map<string, Task[]>;
  noProjectTasks: Task[];
  now: Date;
  onEditTask: (task: Task) => void;
  onResize: (taskId: string, updates: { startDate?: Date; dueDate?: Date }) => void;
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

type DragMode = 'move' | 'left' | 'right';

function TimelineBar({
  row,
  rangeStart,
  totalDays,
  onEdit,
  onResize,
}: {
  row: Row;
  rangeStart: Date;
  totalDays: number;
  onEdit: (task: Task) => void;
  onResize: (taskId: string, updates: { startDate?: Date; dueDate?: Date }) => void;
}) {
  const accent = colorClasses[row.color] ?? colorClasses.blue;
  const baseStartIdx = differenceInCalendarDays(row.start, rangeStart);
  const baseEndIdx = differenceInCalendarDays(row.end, rangeStart);

  const [preview, setPreview] = useState<{ startIdx: number; endIdx: number } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startIdx = preview ? preview.startIdx : baseStartIdx;
  const endIdx = preview ? preview.endIdx : baseEndIdx;

  // Remove any active listeners if the bar unmounts mid-drag.
  useEffect(() => () => cleanupRef.current?.(), []);

  const startDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const d = { mode, x: e.clientX, startIdx: baseStartIdx, endIdx: baseEndIdx, moved: false };

    const onMove = (ev: PointerEvent) => {
      const deltaDays = Math.round((ev.clientX - d.x) / DAY_W);
      if (deltaDays !== 0) d.moved = true;
      let s = d.startIdx;
      let en = d.endIdx;
      if (d.mode === 'move') { s = d.startIdx + deltaDays; en = d.endIdx + deltaDays; }
      else if (d.mode === 'left') s = Math.min(d.startIdx + deltaDays, d.endIdx);
      else en = Math.max(d.endIdx + deltaDays, d.startIdx);
      if (s < 0) { en += -s; s = 0; }
      if (en > totalDays - 1) { en = totalDays - 1; if (d.mode === 'move') s = Math.max(0, en - (d.endIdx - d.startIdx)); }
      setPreview({ startIdx: s, endIdx: en });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      cleanupRef.current = null;
      setPreview((p) => {
        if (d.moved && p) {
          const updates: { startDate?: Date; dueDate?: Date } = {};
          if (d.mode === 'move' || d.mode === 'left') updates.startDate = addDays(rangeStart, p.startIdx);
          if (d.mode === 'move' || d.mode === 'right') updates.dueDate = addDays(rangeStart, p.endIdx);
          onResize(row.task.id, updates);
        } else if (!d.moved) {
          onEdit(row.task);
        }
        return null;
      });
    };

    cleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const left = startIdx * DAY_W + 3;
  const width = (endIdx - startIdx + 1) * DAY_W - 6;
  const dragging = preview !== null;

  return (
    <div
      onPointerDown={startDrag('move')}
      style={{ left, width, height: BAR_H, top: (ROW_H - BAR_H) / 2 }}
      className={clsx(
        'absolute z-[2] rounded-full flex items-center text-sm font-bold text-white shadow-md transition-[filter,box-shadow] select-none touch-none cursor-grab active:cursor-grabbing',
        accent.bg,
        dragging ? 'brightness-110 shadow-xl ring-2 ring-white/70' : 'hover:brightness-105 hover:shadow-lg',
        row.task.status === 'done' && 'opacity-50'
      )}
      title={`${row.task.title} · ${format(addDays(rangeStart, startIdx), 'MMM d')} → ${format(addDays(rangeStart, endIdx), 'MMM d')}`}
    >
      {/* left resize handle */}
      <span onPointerDown={startDrag('left')} className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-l-full hover:bg-white/25" />
      <span className="truncate pl-4 pr-9">{row.task.title}</span>
      {/* end dot */}
      <span className="absolute right-2 w-5 h-5 rounded-full bg-white/40 ring-2 ring-white/60 pointer-events-none" />
      {/* right resize handle */}
      <span onPointerDown={startDrag('right')} className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize rounded-r-full hover:bg-white/25" />
    </div>
  );
}

export function TimelineView({ projects, tasksByProject, noProjectTasks, now, onEditTask, onResize }: TimelineViewProps) {
  const [filterProject, setFilterProject] = useState<string>('all');

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const push = (task: Task, color: EventColor, label: string) => {
      if (!task.dueDate) return;
      const end = new Date(task.dueDate);
      const startSrc = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
      out.push({ task, color, initial: (label[0] ?? '•').toUpperCase(), start: startSrc < end ? startSrc : end, end });
    };
    projects
      .filter((p) => filterProject === 'all' || p.id === filterProject)
      .forEach((p) => (tasksByProject.get(p.id) ?? []).forEach((t) => push(t, p.color, p.name)));
    if (filterProject === 'all') noProjectTasks.forEach((t) => push(t, 'gray', t.title));
    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [projects, tasksByProject, noProjectTasks, filterProject]);

  const { rangeStart, days } = useMemo(() => {
    const dates: Date[] = [now];
    rows.forEach((r) => dates.push(r.start, r.end));
    const minD = dates.reduce((a, b) => (a < b ? a : b), dates[0]);
    const maxD = dates.reduce((a, b) => (a > b ? a : b), dates[0]);
    const start = startOfWeek(minD, { weekStartsOn: 1 });
    const end = endOfWeek(addDays(maxD, 7), { weekStartsOn: 1 }); // pad a week so bars have room to extend
    return { rangeStart: start, days: eachDayOfInterval({ start, end }) };
  }, [rows, now]);

  const filterBar = (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs text-gray-500 dark:text-gray-400">Project:</span>
      <select
        value={filterProject}
        onChange={(e) => setFilterProject(e.target.value)}
        className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-200"
      >
        <option value="all">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <span className="text-[11px] text-gray-400 ml-1">Drag a bar to move it · drag an edge to resize</span>
    </div>
  );

  if (rows.length === 0) {
    return (
      <div>
        {filterBar}
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <CalendarRange className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">No tasks with due dates here — add due dates to see them on the timeline.</p>
        </div>
      </div>
    );
  }

  const gridW = days.length * DAY_W;
  const todayX = differenceInCalendarDays(now, rangeStart) * DAY_W + DAY_W / 2;

  return (
    <div>
      {filterBar}
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
                      <div className="mx-auto w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shadow">{format(d, 'd')}</div>
                    ) : (
                      <div className={clsx('text-sm font-semibold tabular-nums', isSunday ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400')}>{format(d, 'd')}</div>
                    )}
                    <div className="text-[9px] uppercase text-gray-300 dark:text-gray-600 h-3">{isSunday ? 'Sun' : d.getDate() === 1 ? format(d, 'MMM') : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today vertical line */}
          <div className="absolute z-10 w-0.5 bg-blue-500" style={{ left: LABEL_W + todayX, top: 0, bottom: 0 }} />

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
              return (
                <div key={row.task.id} className="flex items-center" style={{ height: ROW_H }}>
                  <div style={{ width: LABEL_W }} className="flex-shrink-0 flex items-center justify-center">
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm', accent.bg)}>{row.initial}</div>
                  </div>
                  <div className="relative flex-1" style={{ height: ROW_H }}>
                    <TimelineBar row={row} rangeStart={rangeStart} totalDays={days.length} onEdit={onEditTask} onResize={onResize} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
