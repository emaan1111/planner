import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureWorker } from '@/lib/transcriptionWorker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH { action: 'retry' } — requeue an errored job.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.action !== 'retry') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    const job = await prisma.transcriptionJob.update({
      where: { id },
      data: { status: 'queued', stage: 'Queued', error: null, attempts: 0, progress: 0 },
    });
    ensureWorker();
    return NextResponse.json(job);
  } catch (error) {
    console.error('Error retrying transcription job:', error);
    return NextResponse.json({ error: 'Failed to retry job' }, { status: 500 });
  }
}

// DELETE — remove a job from the queue/history. Queued jobs are marked canceled
// first (so the worker skips them) and then removed.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.transcriptionJob.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transcription job:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}
