import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET single decision
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decision = await prisma.decision.findUnique({
      where: { id },
      include: {
        linkedEvent: true,
      },
    });

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    return NextResponse.json(decision);
  } catch (error) {
    console.error('Error fetching decision:', error);
    return NextResponse.json({ error: 'Failed to fetch decision' }, { status: 500 });
  }
}

// PUT update decision
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const decision = await prisma.decision.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        outcome: body.outcome,
        notes: body.notes,
        linkedPlanType: body.linkedPlanType,
        linkedEventId: body.linkedEventId,
        decidedAt: body.decidedAt ? new Date(body.decidedAt) : null,
      },
    });

    return NextResponse.json(decision);
  } catch (error) {
    console.error('Error updating decision:', error);
    return NextResponse.json({ error: 'Failed to update decision' }, { status: 500 });
  }
}

// DELETE decision
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.decision.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting decision:', error);
    return NextResponse.json({ error: 'Failed to delete decision' }, { status: 500 });
  }
}
