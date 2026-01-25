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
        { status: 'asc' },
        { priority: 'desc' },
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
    if (!body.linkedPlanType) {
      return NextResponse.json(
        { error: 'linkedPlanType is required' },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status ?? 'todo',
        priority: body.priority ?? 'medium',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        linkedPlanType: body.linkedPlanType,
        linkedEventId: body.linkedEventId,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
