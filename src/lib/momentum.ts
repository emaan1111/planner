// Momentum integration: which planner tasks belong on "today" for the Momentum
// macOS edge-tab app, and the compact shape it receives. Kept free of Next.js
// and Prisma imports so the rules are easy to read and reuse.
//
// Day boundaries are computed in the caller's IANA time zone (Momentum sends
// its own), so "today" means the user's local day even when the server runs
// in UTC on Railway.

import type { Task, Project } from '@prisma/client';

export type MomentumReason = 'overdue' | 'due' | 'in-progress' | 'scheduled' | 'done';

export interface MomentumTask {
  id: string;
  title: string;
  status: string;
  done: boolean;
  priority: string;
  project: { id: string; name: string; color: string } | null;
  dueDate: string | null;   // yyyy-MM-dd in the requested zone
  startDate: string | null; // yyyy-MM-dd in the requested zone
  reason: MomentumReason;
}

export type TaskWithProject = Task & {
  project: Pick<Project, 'id' | 'name' | 'color'> | null;
};

/** Returns `tz` if Intl knows it, otherwise UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/** "yyyy-MM-dd" for `date` as seen in `tz`. String order == chronological order. */
export function dayKeyInZone(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isDayKey(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Why a task is on today's list, or null if it isn't.
 *  - overdue:      open and due before today
 *  - due:          open and due today
 *  - in-progress:  open with status "Working on it" (whatever the dates say)
 *  - scheduled:    open and starts today, or today falls inside its start..due window
 *  - done:         completed today (status done, last touched today) — shown ticked
 */
export function classifyForDay(task: TaskWithProject, day: string, tz: string): MomentumReason | null {
  if (task.archived || task.bucket === 'someday') return null;
  const due = task.dueDate ? dayKeyInZone(task.dueDate, tz) : null;
  const start = task.startDate ? dayKeyInZone(task.startDate, tz) : null;

  if (task.status === 'done') {
    return dayKeyInZone(task.updatedAt, tz) === day ? 'done' : null;
  }
  if (due && due < day) return 'overdue';
  if (due === day) return 'due';
  if (task.status === 'in-progress') return 'in-progress';
  if (start === day) return 'scheduled';
  if (start && due && start <= day && day <= due) return 'scheduled';
  return null;
}

const REASON_RANK: Record<MomentumReason, number> = {
  overdue: 0,
  due: 1,
  'in-progress': 2,
  scheduled: 2,
  done: 3,
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Today's tasks in display order: overdue, due today, in progress/scheduled, then done. */
export function selectTodayTasks(tasks: TaskWithProject[], day: string, tz: string): MomentumTask[] {
  const picked: { task: TaskWithProject; reason: MomentumReason }[] = [];
  for (const task of tasks) {
    const reason = classifyForDay(task, day, tz);
    if (reason) picked.push({ task, reason });
  }
  picked.sort((a, b) => {
    const r = REASON_RANK[a.reason] - REASON_RANK[b.reason];
    if (r !== 0) return r;
    if (a.reason === 'overdue' && b.reason === 'overdue') {
      // oldest debt first
      const d = (a.task.dueDate?.getTime() ?? 0) - (b.task.dueDate?.getTime() ?? 0);
      if (d !== 0) return d;
    }
    const p = (PRIORITY_RANK[a.task.priority] ?? 1) - (PRIORITY_RANK[b.task.priority] ?? 1);
    if (p !== 0) return p;
    if (a.task.order !== b.task.order) return a.task.order - b.task.order;
    return a.task.createdAt.getTime() - b.task.createdAt.getTime();
  });
  return picked.map(({ task, reason }) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    done: task.status === 'done',
    priority: task.priority,
    project: task.project ? { id: task.project.id, name: task.project.name, color: task.project.color } : null,
    dueDate: task.dueDate ? dayKeyInZone(task.dueDate, tz) : null,
    startDate: task.startDate ? dayKeyInZone(task.startDate, tz) : null,
    reason,
  }));
}
