import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const COLUMN_TYPES = ['text', 'number', 'select', 'date', 'checkbox'];

// GET all custom task columns (ordered)
export async function GET() {
  try {
    const columns = await prisma.taskColumn.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(columns);
  } catch (error) {
    console.error('Error fetching task columns:', error);
    return NextResponse.json({ error: 'Failed to fetch task columns' }, { status: 500 });
  }
}

// POST create a custom task column
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const type = COLUMN_TYPES.includes(body.type) ? body.type : 'text';
    const options = Array.isArray(body.options) ? body.options.map((o: unknown) => String(o)) : [];

    const maxOrder = await prisma.taskColumn.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrder?.order ?? -1) + 1;

    const column = await prisma.taskColumn.create({
      data: {
        name,
        type,
        options,
        width: typeof body.width === 'number' ? body.width : type === 'checkbox' ? 80 : 130,
        order: nextOrder,
      },
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    console.error('Error creating task column:', error);
    return NextResponse.json({ error: 'Failed to create task column' }, { status: 500 });
  }
}
