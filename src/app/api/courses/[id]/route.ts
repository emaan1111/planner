import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const course = await prisma.courseTemplate.findUnique({ where: { id } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const course = await prisma.courseTemplate.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        marketingDurationDays: body.marketingDurationDays,
        deliveryDurationDays: body.deliveryDurationDays,
        defaultGapDays: body.defaultGapDays,
        defaultPricePerChild: body.defaultPricePerChild,
        defaultCostPerRun: body.defaultCostPerRun,
        defaultProjectedRegistrations: body.defaultProjectedRegistrations,
        defaultLikelihoodPercent: body.defaultLikelihoodPercent,
        defaultRisks: body.defaultRisks,
        defaultNotes: body.defaultNotes,
        marketingColor: body.marketingColor,
        deliveryColor: body.deliveryColor,
        isMembership: body.isMembership,
        billingPeriodDays: body.billingPeriodDays,
        defaultMonthlyChurnPercent: body.defaultMonthlyChurnPercent,
        defaultRetentionMonths: body.defaultRetentionMonths,
      },
    });
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.courseTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
