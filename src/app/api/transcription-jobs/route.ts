import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { ensureWorker } from '@/lib/transcriptionWorker';
import { extractVideoId } from '@/lib/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EnqueueItem {
  url: string;
  title?: string;
  youtubeId?: string;
  channel?: string;
}

// GET — list jobs for the queue panel (most recent first). Also revives the
// worker, so polling after a server restart picks the queue back up.
export async function GET() {
  try {
    ensureWorker();
    const jobs = await prisma.transcriptionJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error listing transcription jobs:', error);
    return NextResponse.json({ error: 'Failed to list jobs' }, { status: 500 });
  }
}

// POST { items: [{ url, title?, youtubeId?, channel? }] } or { url }
// Enqueue one or more videos for overnight transcription and kick the worker.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const rawItems: EnqueueItem[] = Array.isArray(body.items)
      ? body.items
      : typeof body.url === 'string'
        ? [{ url: body.url }]
        : [];

    // Normalize + dedupe by video id (or raw url when no id is parseable).
    const seen = new Set<string>();
    const items: EnqueueItem[] = [];
    for (const it of rawItems) {
      const url = typeof it?.url === 'string' ? it.url.trim() : '';
      if (!url) continue;
      const youtubeId = it.youtubeId || extractVideoId(url) || undefined;
      const key = youtubeId || url;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ url, title: it.title, youtubeId, channel: it.channel });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid videos to enqueue.' }, { status: 400 });
    }

    const batchId = randomUUID();
    await prisma.transcriptionJob.createMany({
      data: items.map((it) => ({
        source: 'youtube',
        url: it.url,
        youtubeId: it.youtubeId ?? null,
        title: it.title ?? null,
        channel: it.channel ?? null,
        status: 'queued',
        stage: 'Queued',
        batchId,
      })),
    });

    ensureWorker();

    const jobs = await prisma.transcriptionJob.findMany({
      where: { batchId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ batchId, count: jobs.length, jobs }, { status: 201 });
  } catch (error) {
    console.error('Error enqueuing transcription jobs:', error);
    return NextResponse.json({ error: 'Failed to enqueue jobs' }, { status: 500 });
  }
}
