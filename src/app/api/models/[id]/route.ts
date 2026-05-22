import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const model = await prisma.financialModel.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { order: 'asc' } },
        headcount: { orderBy: { order: 'asc' } },
      },
    });
    if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    return NextResponse.json(model);
  } catch (error) {
    console.error('Error fetching model:', error);
    return NextResponse.json({ error: 'Failed to fetch model' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const model = await prisma.financialModel.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        caseType: body.caseType,
        horizonMonths: body.horizonMonths,
        startMonth: body.startMonth ? new Date(body.startMonth) : undefined,
        startingCash: body.startingCash,
        taxPercent: body.taxPercent,
        notes: body.notes,
        order: body.order,
      },
    });
    return NextResponse.json(model);
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.financialModel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}
