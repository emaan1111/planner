import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Duplicate a scenario along with all its placements
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const source = await prisma.scenario.findUnique({
      where: { id },
      include: { placements: true },
    });
    if (!source) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });

    const newName = body.name ?? `${source.name} (Copy)`;
    const targetFolderId = body.folderId ?? source.folderId;

    const created = await prisma.scenario.create({
      data: {
        name: newName,
        description: source.description,
        folderId: targetFolderId,
        color: source.color,
        notes: source.notes,
        order: source.order,
        placements: {
          create: source.placements.map((p) => ({
            courseTemplateId: p.courseTemplateId,
            startDate: p.startDate,
            deliveryStartDate: p.deliveryStartDate,
            marketingDurationDays: p.marketingDurationDays,
            deliveryDurationDays: p.deliveryDurationDays,
            pricePerChild: p.pricePerChild,
            costPerRun: p.costPerRun,
            projectedRegistrations: p.projectedRegistrations,
            likelihoodPercent: p.likelihoodPercent,
            risks: p.risks,
            notes: p.notes,
            isMembership: p.isMembership,
            monthlyChurnPercent: p.monthlyChurnPercent,
            retentionMonths: p.retentionMonths,
            entryMode: p.entryMode,
            trialDurationDays: p.trialDurationDays,
            trialToPaidConversionPercent: p.trialToPaidConversionPercent,
          })),
        },
      },
      include: { placements: { include: { courseTemplate: true } } },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error duplicating scenario:', error);
    return NextResponse.json({ error: 'Failed to duplicate scenario' }, { status: 500 });
  }
}
