import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all plan types
export async function GET() {
  try {
    const planTypes = await prisma.planType.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(planTypes);
  } catch (error) {
    console.error('Error fetching plan types:', error);
    return NextResponse.json({ error: 'Failed to fetch plan types' }, { status: 500 });
  }
}

// POST create new plan type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const planType = await prisma.planType.create({
      data: {
        name: body.name,
        label: body.label,
        color: body.color,
        icon: body.icon ?? 'Star',
      },
    });

    return NextResponse.json(planType, { status: 201 });
  } catch (error) {
    console.error('Error creating plan type:', error);
    return NextResponse.json({ error: 'Failed to create plan type' }, { status: 500 });
  }
}

// DELETE plan type
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.planType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan type:', error);
    return NextResponse.json({ error: 'Failed to delete plan type' }, { status: 500 });
  }
}
