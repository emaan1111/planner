import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT update a custom task column (rename, edit options, resize, reorder)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if ('name' in body) data.name = String(body.name ?? '').trim();
    if ('options' in body) data.options = Array.isArray(body.options) ? body.options.map((o: unknown) => String(o)) : [];
    if ('width' in body && typeof body.width === 'number') data.width = body.width;
    if ('order' in body && typeof body.order === 'number') data.order = body.order;

    const column = await prisma.taskColumn.update({ where: { id }, data });
    return NextResponse.json(column);
  } catch (error) {
    console.error('Error updating task column:', error);
    return NextResponse.json({ error: 'Failed to update task column' }, { status: 500 });
  }
}

// DELETE a custom task column (per-task values in Task.customFields are left as
// orphaned keys — harmless, and recoverable if the column is recreated).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.taskColumn.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task column:', error);
    return NextResponse.json({ error: 'Failed to delete task column' }, { status: 500 });
  }
}
