import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const row = await prisma.modelHeadcount.update({
      where: { id },
      data: {
        name: body.name,
        role: body.role,
        annualSalary: body.annualSalary,
        startMonth: body.startMonth ? new Date(body.startMonth) : undefined,
        endMonth: body.endMonth ? new Date(body.endMonth) : body.endMonth === null ? null : undefined,
        benefitsPercent: body.benefitsPercent,
        notes: body.notes,
        order: body.order,
      },
    });
    return NextResponse.json(row);
  } catch (error) {
    console.error('Error updating headcount:', error);
    return NextResponse.json({ error: 'Failed to update headcount' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.modelHeadcount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting headcount:', error);
    return NextResponse.json({ error: 'Failed to delete headcount' }, { status: 500 });
  }
}
