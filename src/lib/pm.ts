// Project-management hub: shared constants + helpers for the monday.com-style board.
// Single source of truth for status/priority presentation and bucket logic, so the
// Board, Kanban, Cards, and Timeline views all stay visually consistent.

import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Task, TaskStatus, TaskPriority, TaskBucket, EventColor } from '@/types';

// ---- Status (monday signature colors) ----------------------------------------

export interface StatusMeta {
  label: string;
  /** Tailwind classes for the solid colored pill (bg + text). */
  pill: string;
  /** Tailwind bg class for a small status dot. */
  dot: string;
  /** Tailwind bg class for the kanban column header tint. */
  columnTint: string;
  /** Project-palette color used when a status needs an EventColor (e.g. bars). */
  barColor: EventColor;
}

export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  todo: {
    label: 'To Do',
    pill: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    dot: 'bg-gray-400',
    columnTint: 'bg-gray-100 dark:bg-gray-800',
    barColor: 'gray',
  },
  'in-progress': {
    label: 'Working on it',
    pill: 'bg-amber-400 text-white',
    dot: 'bg-amber-400',
    columnTint: 'bg-amber-50 dark:bg-amber-900/20',
    barColor: 'amber',
  },
  stuck: {
    label: 'Stuck',
    pill: 'bg-red-500 text-white',
    dot: 'bg-red-500',
    columnTint: 'bg-red-50 dark:bg-red-900/20',
    barColor: 'red',
  },
  scheduled: {
    label: 'Scheduled',
    pill: 'bg-purple-500 text-white',
    dot: 'bg-purple-500',
    columnTint: 'bg-purple-50 dark:bg-purple-900/20',
    barColor: 'purple',
  },
  done: {
    label: 'Done',
    pill: 'bg-green-500 text-white',
    dot: 'bg-green-500',
    columnTint: 'bg-green-50 dark:bg-green-900/20',
    barColor: 'green',
  },
};

/** Full status set offered in the board/kanban pill dropdowns. */
export const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'stuck', 'scheduled', 'done'];

/** Statuses rendered as Kanban columns (omit 'scheduled' — it lives on the calendar). */
export const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'stuck', 'done'];

// ---- Priority ----------------------------------------------------------------

export interface PriorityMeta {
  label: string;
  pill: string;
}

export const PRIORITY_META: Record<TaskPriority, PriorityMeta> = {
  high: { label: 'High', pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  medium: { label: 'Medium', pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Low', pill: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

export const PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];

// ---- Buckets -----------------------------------------------------------------

export const BUCKET = {
  INBOX: 'inbox',
  ACTIVE: 'active',
  SOMEDAY: 'someday',
} as const;

export function taskBucket(task: Task): TaskBucket {
  return task.bucket ?? 'active';
}

// ---- Helpers -----------------------------------------------------------------

/** % of non-archived tasks that are done (0 when empty). */
export function projectProgress(tasks: Task[]): number {
  const live = tasks.filter((t) => !t.archived);
  if (live.length === 0) return 0;
  const done = live.filter((t) => t.status === 'done').length;
  return Math.round((done / live.length) * 100);
}

/** Count of tasks that are not done and not archived. */
export function openCount(tasks: Task[]): number {
  return tasks.filter((t) => !t.archived && t.status !== 'done').length;
}

// ---- Board list-view columns -------------------------------------------------
// The list view renders a monday-style table. Status / Priority / Due are always
// shown; Project / Type / Category are optional columns the user can add via the
// "Columns" menu. A single ordered column list drives both the header and the
// rows so everything stays aligned.

export type TaskColumnKey = 'project' | 'type' | 'category' | 'status' | 'priority' | 'due';

/** Optional columns the user can toggle on from the board's "Columns" menu. */
export const ADDABLE_COLUMNS: { key: 'type' | 'category'; label: string }[] = [
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
];

export const COLUMN_LABEL: Record<TaskColumnKey, string> = {
  project: 'Project',
  type: 'Type',
  category: 'Category',
  status: 'Status',
  priority: 'Priority',
  due: 'Due',
};

const COLUMN_WIDTH: Record<TaskColumnKey, string> = {
  project: '130px',
  type: '120px',
  category: '120px',
  status: '136px',
  priority: '92px',
  due: '96px',
};

// Canonical left-to-right order of the value columns (between Task title + archive).
const COLUMN_ORDER: TaskColumnKey[] = ['project', 'type', 'category', 'status', 'priority', 'due'];

/** Resolve the ordered list of value columns from a set of toggles. */
export function resolveColumns(opts: { project?: boolean; type?: boolean; category?: boolean }): TaskColumnKey[] {
  const on = new Set<TaskColumnKey>(['status', 'priority', 'due']);
  if (opts.project) on.add('project');
  if (opts.type) on.add('type');
  if (opts.category) on.add('category');
  return COLUMN_ORDER.filter((c) => on.has(c));
}

/** CSS grid template for a header/task row rendering the given value columns. */
export function gridFor(columns: TaskColumnKey[]): string {
  return ['26px', '22px', 'minmax(0,1fr)', ...columns.map((c) => COLUMN_WIDTH[c]), '30px'].join(' ');
}

/** Count of tasks per status (only statuses that appear), for the summary strip. */
export function statusCounts(tasks: Task[]): { status: TaskStatus; count: number }[] {
  const counts = new Map<TaskStatus, number>();
  tasks.forEach((t) => counts.set(t.status, (counts.get(t.status) ?? 0) + 1));
  return STATUS_ORDER.filter((s) => counts.has(s)).map((s) => ({ status: s, count: counts.get(s)! }));
}

/** Tasks visible on the active board: not archived, in the 'active' bucket. */
export function isActiveBoardTask(task: Task): boolean {
  return !task.archived && taskBucket(task) === 'active';
}

/** True if the task is due in the current week (Mon–Sun). Tasks without a due date are excluded. */
export function isDueThisWeek(task: Task, now: Date): boolean {
  if (!task.dueDate) return false;
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return isWithinInterval(new Date(task.dueDate), { start, end });
}
