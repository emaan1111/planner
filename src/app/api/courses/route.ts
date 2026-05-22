import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const courses = await prisma.courseTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const course = await prisma.courseTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        marketingDurationDays: body.marketingDurationDays ?? 14,
        deliveryDurationDays: body.deliveryDurationDays ?? 7,
        defaultPricePerChild: body.defaultPricePerChild ?? 0,
        defaultCostPerRun: body.defaultCostPerRun ?? 0,
        defaultProjectedRegistrations: body.defaultProjectedRegistrations ?? 0,
        defaultLikelihoodPercent: body.defaultLikelihoodPercent ?? 70,
        defaultRisks: body.defaultRisks,
        defaultNotes: body.defaultNotes,
        marketingColor: body.marketingColor ?? 'purple',
        deliveryColor: body.deliveryColor ?? 'blue',
      },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
