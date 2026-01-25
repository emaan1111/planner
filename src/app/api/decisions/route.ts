import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all decisions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const linkedPlanType = searchParams.get('linkedPlanType');
    const linkedEventId = searchParams.get('linkedEventId');

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }
    if (linkedPlanType) {
      where.linkedPlanType = linkedPlanType;
    }
    if (linkedEventId) {
      where.linkedEventId = linkedEventId;
    }

    const decisions = await prisma.decision.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        linkedEvent: true,
      },
    });

    return NextResponse.json(decisions);
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 });
  }
}

// POST create new decision
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const decision = await prisma.decision.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status ?? 'pending',
        outcome: body.outcome,
        notes: body.notes,
        linkedPlanType: body.linkedPlanType,
        linkedEventId: body.linkedEventId,
        decidedAt: body.decidedAt ? new Date(body.decidedAt) : null,
      },
    });

    return NextResponse.json(decision, { status: 201 });
  } catch (error) {
    console.error('Error creating decision:', error);
    return NextResponse.json({ error: 'Failed to create decision' }, { status: 500 });
  }
}
