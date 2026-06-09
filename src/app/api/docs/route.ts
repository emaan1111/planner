import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all documents (lightweight: list ordered by recently updated)
export async function GET() {
  try {
    const docs = await prisma.doc.findMany({
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json(docs);
  } catch (error) {
    console.error('Error fetching docs:', error);
    return NextResponse.json({ error: 'Failed to fetch docs' }, { status: 500 });
  }
}

// POST create a new document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const maxOrderDoc = await prisma.doc.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderDoc?.order ?? -1) + 1;

    const doc = await prisma.doc.create({
      data: {
        title: body.title?.trim() || 'Untitled document',
        blocks: body.blocks ?? [],
        order: nextOrder,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error('Error creating doc:', error);
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 });
  }
}
