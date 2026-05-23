import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const scenario = await prisma.scenario.findUnique({
      where: { id },
      include: { placements: { include: { courseTemplate: true } } },
    });
    if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json({ error: 'Failed to fetch scenario' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const scenario = await prisma.scenario.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        folderId: body.folderId,
        color: body.color,
        notes: body.notes,
        order: body.order,
        isBest: body.isBest,
      },
    });
    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.scenario.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
  }
}
