import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const event = await prisma.scenarioEvent.update({
      where: { id },
      data: {
        title: body.title,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        color: body.color,
        kind: body.kind,
        notes: body.notes,
      },
    });
    return NextResponse.json(event);
  } catch (error) {
    console.error('Error updating scenario event:', error);
    return NextResponse.json({ error: 'Failed to update scenario event' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.scenarioEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario event:', error);
    return NextResponse.json({ error: 'Failed to delete scenario event' }, { status: 500 });
  }
}
