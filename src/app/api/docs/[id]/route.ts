import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET a single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await prisma.doc.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error fetching doc:', error);
    return NextResponse.json({ error: 'Failed to fetch doc' }, { status: 500 });
  }
}

// PUT update a document (partial: only touches the fields present in the body)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if ('title' in body) data.title = body.title?.trim() || 'Untitled document';
    if ('blocks' in body) data.blocks = body.blocks;
    if ('order' in body) data.order = body.order;

    const doc = await prisma.doc.update({ where: { id }, data });
    return NextResponse.json(doc);
  } catch (error) {
    console.error('Error updating doc:', error);
    return NextResponse.json({ error: 'Failed to update doc' }, { status: 500 });
  }
}

// DELETE a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.doc.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting doc:', error);
    return NextResponse.json({ error: 'Failed to delete doc' }, { status: 500 });
  }
}
