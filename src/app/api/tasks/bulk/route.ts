import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type BulkAction =
  | 'archive'
  | 'restore'
  | 'setStatus'
  | 'setPriority'
  | 'setProject'
  | 'setBucket'
  | 'setCategory'
  | 'copy'
  | 'delete';

// POST bulk-mutate many tasks in one query.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ids?: string[]; action?: BulkAction; value?: string };
    const { ids, action, value } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'delete') {
      const result = await prisma.task.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ count: result.count });
    }

    // Copy selected tasks into another project (value = target projectId, '' = no project).
    if (action === 'copy') {
      const src = await prisma.task.findMany({ where: { id: { in: ids } } });
      const maxOrderTask = await prisma.task.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
      let nextOrder = (maxOrderTask?.order ?? -1) + 1;
      const copies = src.map((t) => ({
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        bucket: 'active',
        archived: false,
        startDate: t.startDate,
        dueDate: t.dueDate,
        category: t.category,
        linkedPlanType: t.linkedPlanType,
        projectId: value || null,
        order: nextOrder++,
      }));
      const result = await prisma.task.createMany({ data: copies });
      return NextResponse.json({ count: result.count });
    }

    let data: Record<string, unknown>;
    switch (action) {
      case 'archive':
        data = { archived: true };
        break;
      case 'restore':
        data = { archived: false };
        break;
      case 'setStatus':
        if (!value) return NextResponse.json({ error: 'value required for setStatus' }, { status: 400 });
        data = { status: value };
        break;
      case 'setPriority':
        if (!value) return NextResponse.json({ error: 'value required for setPriority' }, { status: 400 });
        data = { priority: value };
        break;
      case 'setProject':
        // value '' or undefined clears the project (back to no project).
        data = { projectId: value || null };
        break;
      case 'setBucket':
        if (!value) return NextResponse.json({ error: 'value required for setBucket' }, { status: 400 });
        data = { bucket: value };
        break;
      case 'setCategory':
        data = { category: value || null };
        break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const result = await prisma.task.updateMany({ where: { id: { in: ids } }, data });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error('Error bulk-updating tasks:', error);
    return NextResponse.json({ error: 'Failed to bulk-update tasks' }, { status: 500 });
  }
}
