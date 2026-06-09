import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET a single video project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.videoProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Video project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching video project:', error);
    return NextResponse.json({ error: 'Failed to fetch video project' }, { status: 500 });
  }
}

// PATCH update a video project (partial: only touches fields present in the body)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if ('title' in body) data.title = body.title?.trim() || 'Untitled video';
    if ('words' in body) data.words = body.words;
    if ('status' in body) data.status = body.status;
    if ('durationSec' in body) data.durationSec = body.durationSec;
    if ('fileName' in body) data.fileName = body.fileName;
    if ('order' in body) data.order = body.order;

    const project = await prisma.videoProject.update({ where: { id }, data });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating video project:', error);
    return NextResponse.json({ error: 'Failed to update video project' }, { status: 500 });
  }
}

// DELETE a video project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.videoProject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video project:', error);
    return NextResponse.json({ error: 'Failed to delete video project' }, { status: 500 });
  }
}
