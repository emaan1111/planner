import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const models = await prisma.financialModel.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const model = await prisma.financialModel.create({
      data: {
        name: body.name ?? 'New Model',
        description: body.description,
        caseType: body.caseType ?? 'baseline',
        horizonMonths: body.horizonMonths ?? 24,
        startMonth: body.startMonth ? new Date(body.startMonth) : new Date(),
        startingCash: body.startingCash ?? 0,
        taxPercent: body.taxPercent ?? 0,
        notes: body.notes,
        order: body.order ?? 0,
      },
    });
    return NextResponse.json(model, { status: 201 });
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json({ error: 'Failed to create model' }, { status: 500 });
  }
}
