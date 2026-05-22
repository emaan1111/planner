import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET placements, optionally filtered by scenarioId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');
    const where = scenarioId ? { scenarioId } : {};
    const placements = await prisma.coursePlacement.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: { courseTemplate: true },
    });
    return NextResponse.json(placements);
  } catch (error) {
    console.error('Error fetching placements:', error);
    return NextResponse.json({ error: 'Failed to fetch placements' }, { status: 500 });
  }
}

// POST create a placement — initialises fields from the course template if not provided
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const template = await prisma.courseTemplate.findUnique({ where: { id: body.courseTemplateId } });
    if (!template) return NextResponse.json({ error: 'Course template not found' }, { status: 400 });

    const placement = await prisma.coursePlacement.create({
      data: {
        scenarioId: body.scenarioId,
        courseTemplateId: body.courseTemplateId,
        startDate: new Date(body.startDate),
        marketingDurationDays: body.marketingDurationDays ?? template.marketingDurationDays,
        deliveryDurationDays: body.deliveryDurationDays ?? template.deliveryDurationDays,
        pricePerChild: body.pricePerChild ?? template.defaultPricePerChild,
        costPerRun: body.costPerRun ?? template.defaultCostPerRun,
        projectedRegistrations: body.projectedRegistrations ?? template.defaultProjectedRegistrations,
        likelihoodPercent: body.likelihoodPercent ?? template.defaultLikelihoodPercent,
        risks: body.risks ?? template.defaultRisks,
        notes: body.notes ?? template.defaultNotes,
      },
      include: { courseTemplate: true },
    });
    return NextResponse.json(placement, { status: 201 });
  } catch (error) {
    console.error('Error creating placement:', error);
    return NextResponse.json({ error: 'Failed to create placement' }, { status: 500 });
  }
}
