import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type BulkAction = 'archive' | 'restore' | 'delete';

// POST bulk-mutate many projects in one query.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ids?: string[]; action?: BulkAction };
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'delete') {
      const result = await prisma.project.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ count: result.count });
    }

    const data =
      action === 'archive' ? { archived: true } : action === 'restore' ? { archived: false } : null;
    if (!data) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const result = await prisma.project.updateMany({ where: { id: { in: ids } }, data });
    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error('Error bulk-updating projects:', error);
    return NextResponse.json({ error: 'Failed to bulk-update projects' }, { status: 500 });
  }
}
