import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const linkedPlanType = searchParams.get('linkedPlanType');
    const linkedEventId = searchParams.get('linkedEventId');

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }
    if (linkedPlanType) {
      where.linkedPlanType = linkedPlanType;
    }
    if (linkedEventId) {
      where.linkedEventId = linkedEventId;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        linkedEvent: true,
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get the highest order value to place new task at the end
    const maxOrderTask = await prisma.task.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderTask?.order ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status ?? 'todo',
        priority: body.priority ?? 'medium',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        linkedPlanType: body.linkedPlanType || null,
        linkedEventId: body.linkedEventId,
        projectId: body.projectId || null,
        order: nextOrder,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH reorder tasks
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body as { orderedIds: string[] };

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 });
    }

    // Update each task's order based on its position in the array
    const updates = orderedIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { order: index },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    return NextResponse.json({ error: 'Failed to reorder tasks' }, { status: 500 });
  }
}
