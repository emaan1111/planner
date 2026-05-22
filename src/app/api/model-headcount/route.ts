import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    const list = await prisma.modelHeadcount.findMany({
      where: modelId ? { modelId } : undefined,
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching headcount:', error);
    return NextResponse.json({ error: 'Failed to fetch headcount' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const row = await prisma.modelHeadcount.create({
      data: {
        modelId: body.modelId,
        name: body.name ?? 'New role',
        role: body.role,
        annualSalary: body.annualSalary ?? 0,
        startMonth: body.startMonth ? new Date(body.startMonth) : new Date(),
        endMonth: body.endMonth ? new Date(body.endMonth) : null,
        benefitsPercent: body.benefitsPercent ?? 20,
        notes: body.notes,
        order: body.order ?? 0,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Error creating headcount:', error);
    return NextResponse.json({ error: 'Failed to create headcount' }, { status: 500 });
  }
}
