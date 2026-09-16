import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const MAX_BATCH = 500;

interface IncomingTask {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  bucket?: unknown;
  archived?: unknown;
  startDate?: unknown;
  dueDate?: unknown;
  category?: unknown;
  linkedPlanType?: unknown;
  linkedEventId?: unknown;
  projectId?: unknown;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const date = (v: unknown): Date | null => {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// POST create many tasks in one request (one per entry), keeping their order.
// Backs the "one task per line" quick-add; each entry accepts the same optional
// fields as a single-task POST.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { tasks?: IncomingTask[] };
    const incoming = Array.isArray(body.tasks) ? body.tasks : null;

    if (!incoming || incoming.length === 0) {
      return NextResponse.json({ error: 'tasks array is required' }, { status: 400 });
    }
    if (incoming.length > MAX_BATCH) {
      return NextResponse.json({ error: `At most ${MAX_BATCH} tasks per batch` }, { status: 400 });
    }

    const rows = incoming
      .map((t) => ({ ...t, title: str(t.title) }))
      .filter((t): t is IncomingTask & { title: string } => !!t.title);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Every task needs a title' }, { status: 400 });
    }

    // Append after the current last task so the new lines keep their typed order.
    const maxOrderTask = await prisma.task.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderTask?.order ?? -1) + 1;

    const tasks = await prisma.task.createManyAndReturn({
      data: rows.map((t, i) => ({
        title: t.title,
        description: str(t.description),
        status: str(t.status) ?? 'todo',
        priority: str(t.priority) ?? 'medium',
        bucket: str(t.bucket) ?? 'active',
        archived: t.archived === true,
        startDate: date(t.startDate),
        dueDate: date(t.dueDate),
        category: str(t.category),
        linkedPlanType: str(t.linkedPlanType),
        linkedEventId: str(t.linkedEventId),
        projectId: str(t.projectId),
        order: nextOrder + i,
      })),
    });

    return NextResponse.json(tasks, { status: 201 });
  } catch (error) {
    console.error('Error creating tasks:', error);
    return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 });
  }
}
