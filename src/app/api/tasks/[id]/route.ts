import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        linkedEvent: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PUT update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Partial update: only touch fields actually present in the request body so a
    // single-field write (e.g. an inline status pill) never clears the others.
    const data: Record<string, unknown> = {};
    if ('title' in body) data.title = body.title;
    if ('description' in body) data.description = body.description;
    if ('status' in body) data.status = body.status;
    if ('priority' in body) data.priority = body.priority;
    if ('bucket' in body) data.bucket = body.bucket;
    if ('archived' in body) data.archived = body.archived;
    if ('startDate' in body) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if ('category' in body) data.category = body.category || null;
    if ('linkedPlanType' in body) data.linkedPlanType = body.linkedPlanType || null;
    if ('linkedEventId' in body) data.linkedEventId = body.linkedEventId || null;
    if ('projectId' in body) data.projectId = body.projectId || null;
    if ('order' in body) data.order = body.order;
    if ('customFields' in body) data.customFields = body.customFields ?? {};

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
