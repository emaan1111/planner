// Durable, in-process transcription worker. This is what lets a batch of
// YouTube videos transcribe overnight without the browser staying open: the
// queue lives in Postgres (TranscriptionJob), and this singleton loop claims
// jobs one at a time, runs the download -> transcribe pipeline, and writes the
// result into a VideoProject. The browser only enqueues + polls; it can close.
//
// Resilience:
//   - One loop at a time (guarded by a global flag, HMR-safe in dev).
//   - On first start it requeues any job left mid-run by a server restart.
//   - Each job retries up to MAX_ATTEMPTS before being marked errored.
//
// SERVER-ONLY.

import { rm } from 'node:fs/promises';
import prisma from '@/lib/prisma';
import { downloadAudio } from '@/lib/youtube';
import { transcribeAudioFile } from '@/lib/transcribeServer';
import type { Word } from '@/types/video';

const MAX_ATTEMPTS = 3;

// Pause between jobs so a big overnight batch doesn't hammer YouTube (a common
// cause of 403s). Longer after a failure, which is usually rate-limiting.
const JOB_DELAY_MS = Number(process.env.TRANSCRIBE_JOB_DELAY_MS) || 4000;
const FAILURE_COOLDOWN_MS = Number(process.env.TRANSCRIBE_FAILURE_COOLDOWN_MS) || 30000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Keep the singleton on globalThis so Next's dev HMR doesn't spawn parallel
// loops (mirrors the prisma client pattern in lib/prisma.ts).
const g = globalThis as unknown as {
  __transcriptionWorker?: { running: boolean; recovered: boolean };
};
const state = (g.__transcriptionWorker ??= { running: false, recovered: false });

// Kick the worker if it isn't already looping. Safe to call from any request
// handler (enqueue + poll both call it), so the worker revives after a restart.
export function ensureWorker(): void {
  if (state.running) return;
  state.running = true;
  // Fire-and-forget; the loop clears `running` when the queue drains.
  runLoop().catch((err) => {
    console.error('Transcription worker crashed:', err);
    state.running = false;
  });
}

async function runLoop(): Promise<void> {
  try {
    // One-time crash recovery: anything left "in flight" by a previous process
    // is put back in the queue. Done before claiming so we never reset a job
    // this process is actively working on.
    if (!state.recovered) {
      await prisma.transcriptionJob.updateMany({
        where: { status: { in: ['downloading', 'transcribing'] } },
        data: { status: 'queued', stage: 'Requeued after restart' },
      });
      state.recovered = true;
    }

    // Drain the queue.
    for (;;) {
      const job = await prisma.transcriptionJob.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
      });
      if (!job) break;
      // A job can vanish mid-drain (user deletes it); never let that stop the
      // queue. Per-job failures are already handled inside processJob.
      const ok = await processJob(job.id).catch((err) => {
        console.error(`Transcription job ${job.id} threw out of band:`, err);
        return false;
      });
      // Breathe between jobs; back off longer after a failure (likely throttling).
      await sleep(ok ? JOB_DELAY_MS : FAILURE_COOLDOWN_MS);
    }
  } finally {
    state.running = false;
  }
}

// Returns true on success, false on failure (job was requeued or errored).
async function processJob(jobId: string): Promise<boolean> {
  // Claim the job, bumping the attempt counter.
  const job = await prisma.transcriptionJob.update({
    where: { id: jobId },
    data: { status: 'downloading', stage: 'Downloading audio…', progress: 0, attempts: { increment: 1 } },
  });

  let workDir: string | null = null;
  try {
    const audio = await downloadAudio(job.url);
    workDir = audio.workDir;

    await prisma.transcriptionJob.update({
      where: { id: jobId },
      data: { status: 'transcribing', stage: 'Transcribing…' },
    });

    let lastWrite = 0;
    const { words, durationSec } = await transcribeAudioFile(
      audio.filePath,
      audio.workDir,
      (p) => {
        // Throttle progress writes so we don't hammer the DB per chunk.
        const now = Date.now();
        if (p.stage === 'transcribing' && p.ratio != null && now - lastWrite > 2000) {
          lastWrite = now;
          prisma.transcriptionJob
            .update({ where: { id: jobId }, data: { progress: p.ratio } })
            .catch(() => {});
        }
      }
    );

    if (words.length === 0) {
      throw new Error('No speech was detected in this video.');
    }

    const project = await createVideoProject(job.title, job.url, job.youtubeId, durationSec, words);

    await prisma.transcriptionJob.update({
      where: { id: jobId },
      data: {
        status: 'done',
        stage: 'Done',
        progress: 1,
        durationSec,
        videoProjectId: project.id,
        error: null,
      },
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    const current = await prisma.transcriptionJob.findUnique({ where: { id: jobId } });
    const exhausted = (current?.attempts ?? MAX_ATTEMPTS) >= MAX_ATTEMPTS;
    await prisma.transcriptionJob.update({
      where: { id: jobId },
      data: {
        status: exhausted ? 'error' : 'queued',
        stage: exhausted ? 'Failed' : 'Retrying…',
        error: message,
      },
    });
    console.error(`Transcription job ${jobId} failed (attempt ${current?.attempts}):`, message);
    return false;
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function createVideoProject(
  title: string | null,
  url: string,
  youtubeId: string | null,
  durationSec: number,
  words: Word[]
) {
  const maxOrder = await prisma.videoProject.findFirst({
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return prisma.videoProject.create({
    data: {
      title: title?.trim() || 'YouTube transcript',
      status: 'ready',
      durationSec,
      words: words as unknown as object,
      source: 'youtube',
      sourceUrl: url,
      youtubeId,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });
}
