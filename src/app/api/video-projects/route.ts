import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all video projects (most recently updated first)
export async function GET() {
  try {
    const projects = await prisma.videoProject.findMany({
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching video projects:', error);
    return NextResponse.json({ error: 'Failed to fetch video projects' }, { status: 500 });
  }
}

// POST create a new video project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const maxOrder = await prisma.videoProject.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrder?.order ?? -1) + 1;

    const project = await prisma.videoProject.create({
      data: {
        title: body.title?.trim() || 'Untitled video',
        fileName: body.fileName ?? null,
        durationSec: typeof body.durationSec === 'number' ? body.durationSec : 0,
        words: body.words ?? [],
        status: body.status ?? 'draft',
        order: nextOrder,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating video project:', error);
    return NextResponse.json({ error: 'Failed to create video project' }, { status: 500 });
  }
}
