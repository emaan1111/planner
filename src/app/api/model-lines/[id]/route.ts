import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const line = await prisma.modelLine.update({
      where: { id },
      data: {
        name: body.name,
        kind: body.kind,
        category: body.category,
        inputMode: body.inputMode,
        flatAmount: body.flatAmount,
        startAmount: body.startAmount,
        monthlyGrowthPercent: body.monthlyGrowthPercent,
        manualValues: body.manualValues ?? undefined,
        linkedScenarioId: body.linkedScenarioId,
        linkedField: body.linkedField,
        driverPercent: body.driverPercent,
        driverBase: body.driverBase,
        order: body.order,
        notes: body.notes,
      },
    });
    return NextResponse.json(line);
  } catch (error) {
    console.error('Error updating line:', error);
    return NextResponse.json({ error: 'Failed to update line' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.modelLine.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting line:', error);
    return NextResponse.json({ error: 'Failed to delete line' }, { status: 500 });
  }
}
