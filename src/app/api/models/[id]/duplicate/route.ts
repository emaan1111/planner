import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Duplicate a model along with all lines + headcount.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const source = await prisma.financialModel.findUnique({
      where: { id },
      include: { lines: true, headcount: true },
    });
    if (!source) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    const created = await prisma.financialModel.create({
      data: {
        name: body.name ?? `${source.name} (Copy)`,
        description: source.description,
        caseType: body.caseType ?? source.caseType,
        horizonMonths: source.horizonMonths,
        startMonth: source.startMonth,
        startingCash: source.startingCash,
        taxPercent: source.taxPercent,
        notes: source.notes,
        order: source.order,
        lines: {
          create: source.lines.map((l) => ({
            name: l.name,
            kind: l.kind,
            category: l.category,
            inputMode: l.inputMode,
            flatAmount: l.flatAmount,
            startAmount: l.startAmount,
            monthlyGrowthPercent: l.monthlyGrowthPercent,
            manualValues: l.manualValues ?? undefined,
            linkedScenarioId: l.linkedScenarioId,
            linkedField: l.linkedField,
            driverPercent: l.driverPercent,
            driverBase: l.driverBase,
            order: l.order,
            notes: l.notes,
          })),
        },
        headcount: {
          create: source.headcount.map((h) => ({
            name: h.name,
            role: h.role,
            annualSalary: h.annualSalary,
            startMonth: h.startMonth,
            endMonth: h.endMonth,
            benefitsPercent: h.benefitsPercent,
            notes: h.notes,
            order: h.order,
          })),
        },
      },
      include: { lines: true, headcount: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error duplicating model:', error);
    return NextResponse.json({ error: 'Failed to duplicate model' }, { status: 500 });
  }
}
