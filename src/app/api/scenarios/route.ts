import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const scenarios = await prisma.scenario.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scenario = await prisma.scenario.create({
      data: {
        name: body.name,
        description: body.description,
        folderId: body.folderId ?? null,
        color: body.color ?? 'indigo',
        notes: body.notes,
        order: body.order ?? 0,
        isBest: body.isBest ?? false,
      },
    });
    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
}
