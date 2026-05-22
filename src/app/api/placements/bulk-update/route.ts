import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Apply a partial update to every placement of a course across all scenarios.
// Body: { courseTemplateId: string, updates: PartialPlacement }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseTemplateId, updates } = body as {
      courseTemplateId: string;
      updates: Record<string, unknown>;
    };
    if (!courseTemplateId || !updates) {
      return NextResponse.json({ error: 'courseTemplateId and updates are required' }, { status: 400 });
    }

    // Whitelist updatable fields
    const allowed = [
      'marketingDurationDays',
      'deliveryDurationDays',
      'pricePerChild',
      'costPerRun',
      'projectedRegistrations',
      'likelihoodPercent',
      'risks',
      'notes',
      'deliveryStartDate',
      'isMembership',
      'monthlyChurnPercent',
      'retentionMonths',
      'entryMode',
      'trialDurationDays',
      'trialToPaidConversionPercent',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) data[key] = updates[key];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid update fields supplied' }, { status: 400 });
    }

    const result = await prisma.coursePlacement.updateMany({
      where: { courseTemplateId },
      data,
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Error bulk updating placements:', error);
    return NextResponse.json({ error: 'Failed to bulk update placements' }, { status: 500 });
  }
}
