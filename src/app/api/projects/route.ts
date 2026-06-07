import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get('archived');

    const where: Record<string, unknown> = {};
    if (archived === 'true' || archived === 'false') {
      where.archived = archived === 'true';
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Place new project at the end of the board.
    const maxOrderProject = await prisma.project.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderProject?.order ?? -1) + 1;

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        color: body.color ?? 'blue',
        isActive: body.isActive ?? true,
        order: nextOrder,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

// PATCH reorder projects
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body as { orderedIds: string[] };

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 });
    }

    const updates = orderedIds.map((id, index) =>
      prisma.project.update({
        where: { id },
        data: { order: index },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering projects:', error);
    return NextResponse.json({ error: 'Failed to reorder projects' }, { status: 500 });
  }
}
