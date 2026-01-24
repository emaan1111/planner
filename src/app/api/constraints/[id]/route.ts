import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT update constraint
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const constraint = await prisma.constraint.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        description: body.description,
        ruleType: body.rule?.type || body.ruleType,
        ruleParams: body.rule?.params || body.ruleParams,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({
      id: constraint.id,
      name: constraint.name,
      type: constraint.type,
      description: constraint.description,
      rule: {
        type: constraint.ruleType,
        params: constraint.ruleParams,
      },
      isActive: constraint.isActive,
    });
  } catch (error) {
    console.error('Error updating constraint:', error);
    return NextResponse.json({ error: 'Failed to update constraint' }, { status: 500 });
  }
}

// DELETE constraint
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.constraint.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting constraint:', error);
    return NextResponse.json({ error: 'Failed to delete constraint' }, { status: 500 });
  }
}
