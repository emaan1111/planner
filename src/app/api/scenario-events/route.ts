import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    const events = await prisma.scenarioEvent.findMany({
      where: scenarioId ? { scenarioId } : undefined,
      orderBy: { startDate: 'asc' },
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching scenario events:', error);
    return NextResponse.json({ error: 'Failed to fetch scenario events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await prisma.scenarioEvent.create({
      data: {
        scenarioId: body.scenarioId,
        title: body.title,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate ?? body.startDate),
        color: body.color ?? 'amber',
        kind: body.kind ?? 'note',
        notes: body.notes,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating scenario event:', error);
    return NextResponse.json({ error: 'Failed to create scenario event' }, { status: 500 });
  }
}
