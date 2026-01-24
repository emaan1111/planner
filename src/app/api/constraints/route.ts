import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all constraints
export async function GET() {
  try {
    const constraints = await prisma.constraint.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Transform to match frontend format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = constraints.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      description: c.description,
      rule: {
        type: c.ruleType,
        params: c.ruleParams as Record<string, unknown>,
      },
      isActive: c.isActive,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching constraints:', error);
    return NextResponse.json({ error: 'Failed to fetch constraints' }, { status: 500 });
  }
}

// POST create new constraint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const constraint = await prisma.constraint.create({
      data: {
        name: body.name,
        type: body.type,
        description: body.description,
        ruleType: body.rule?.type || body.ruleType,
        ruleParams: body.rule?.params || body.ruleParams || {},
        isActive: body.isActive ?? true,
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating constraint:', error);
    return NextResponse.json({ error: 'Failed to create constraint' }, { status: 500 });
  }
}
