import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const lines = await prisma.modelLine.findMany({
      where: modelId ? { modelId } : undefined,
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(lines);
  } catch (error) {
    console.error('Error fetching lines:', error);
    return NextResponse.json({ error: 'Failed to fetch lines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const line = await prisma.modelLine.create({
      data: {
        modelId: body.modelId,
        name: body.name ?? 'New line',
        kind: body.kind ?? 'cost',
        category: body.category,
        inputMode: body.inputMode ?? 'flat',
        flatAmount: body.flatAmount,
        startAmount: body.startAmount,
        monthlyGrowthPercent: body.monthlyGrowthPercent,
        manualValues: body.manualValues ?? undefined,
        linkedScenarioId: body.linkedScenarioId,
        linkedField: body.linkedField,
        driverPercent: body.driverPercent,
        driverBase: body.driverBase,
        order: body.order ?? 0,
        notes: body.notes,
      },
    });
    return NextResponse.json(line, { status: 201 });
  } catch (error) {
    console.error('Error creating line:', error);
    return NextResponse.json({ error: 'Failed to create line' }, { status: 500 });
  }
}
