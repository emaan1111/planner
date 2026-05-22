import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const placement = await prisma.coursePlacement.update({
      where: { id },
      data: {
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        marketingDurationDays: body.marketingDurationDays,
        deliveryDurationDays: body.deliveryDurationDays,
        pricePerChild: body.pricePerChild,
        costPerRun: body.costPerRun,
        projectedRegistrations: body.projectedRegistrations,
        likelihoodPercent: body.likelihoodPercent,
        risks: body.risks,
        notes: body.notes,
      },
      include: { courseTemplate: true },
    });
    return NextResponse.json(placement);
  } catch (error) {
    console.error('Error updating placement:', error);
    return NextResponse.json({ error: 'Failed to update placement' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.coursePlacement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting placement:', error);
    return NextResponse.json({ error: 'Failed to delete placement' }, { status: 500 });
  }
}
