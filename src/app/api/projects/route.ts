import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: 'asc' },
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

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        color: body.color ?? 'blue',
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
