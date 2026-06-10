// Server-side transcription: take a downloaded audio file, split it into small
// chunks with ffmpeg, and transcribe each chunk with OpenAI Whisper (word-level
// timestamps), then offset + merge into the app's Word[] shape.
//
// Chunking matters for two reasons:
//   1. Whisper's API caps uploads at 25 MB — a multi-hour livestream would blow
//      past that as a single file.
//   2. Smaller chunks fail and retry independently, so one bad minute doesn't
//      sink an overnight batch.
//
// SERVER-ONLY: uses node:child_process / node:fs and the OpenAI SDK.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import type { Word } from '@/types/video';

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

// 20-minute chunks: each is a couple of MB as 16 kHz mono Ogg Opus — far under
// Whisper's 25 MB limit, with plenty of headroom for very long streams.
const SEGMENT_SEC = 20 * 60;

// Whisper transcription model. whisper-1 is the one that returns word-level
// timestamps via verbose_json, which is what drives the transcript editor.
const WHISPER_MODEL = 'whisper-1';

export interface TranscribeProgress {
  stage: 'segmenting' | 'transcribing';
  // 0..1 best-effort (fraction of chunks transcribed).
  ratio?: number;
}

interface Segment {
  filePath: string;
  offsetSec: number;
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set — required for server-side transcription.');
  }
  if (!openaiClient) openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// Split + downsample the input into 16 kHz mono Ogg Opus chunks. We also emit a
// CSV segment list so we get each chunk's exact start offset (no drift math).
async function segmentAudio(inputPath: string, workDir: string): Promise<Segment[]> {
  const listPath = path.join(workDir, 'segments.csv');
  const pattern = path.join(workDir, 'chunk_%04d.ogg');

  await execFileAsync(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', inputPath,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-c:a', 'libopus',
      '-b:a', '16k',
      '-f', 'segment',
      '-segment_time', String(SEGMENT_SEC),
      '-segment_list', listPath,
      '-segment_list_type', 'csv',
      '-reset_timestamps', '1',
      pattern,
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );

  // CSV rows: "chunk_0000.ogg,0.000000,1200.000000"
  const csv = await readFile(listPath, 'utf8');
  const segments: Segment[] = [];
  for (const line of csv.split('\n')) {
    const cols = line.trim().split(',');
    if (cols.length < 3 || !cols[0]) continue;
    const startSec = Number.parseFloat(cols[1]);
    const endSec = Number.parseFloat(cols[2]);
    // ffmpeg can emit a sub-second tail segment at the very end; skip anything
    // too short to contain speech so Whisper never receives an empty clip.
    if (Number.isFinite(startSec) && Number.isFinite(endSec) && endSec - startSec < 1) continue;
    segments.push({
      filePath: path.join(workDir, cols[0]),
      offsetSec: Number.isFinite(startSec) ? startSec : 0,
    });
  }
  return segments;
}

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

async function transcribeChunk(filePath: string): Promise<WhisperWord[]> {
  const client = getOpenAI();
  const res = (await client.audio.transcriptions.create({
    file: createReadStream(filePath),
    model: WHISPER_MODEL,
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
  })) as unknown as { words?: WhisperWord[] };
  return res.words ?? [];
}

// Transcribe a downloaded audio file into timed Word[]. `onProgress` reports
// the segmenting step and then the fraction of chunks completed.
export async function transcribeAudioFile(
  inputPath: string,
  workDir: string,
  onProgress?: (p: TranscribeProgress) => void
): Promise<{ words: Word[]; durationSec: number }> {
  onProgress?.({ stage: 'segmenting' });
  const segments = await segmentAudio(inputPath, workDir);

  const words: Word[] = [];
  let durationSec = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const chunkWords = await transcribeChunk(seg.filePath);
    for (const w of chunkWords) {
      const text = w.word.trim();
      if (!text) continue;
      const start = seg.offsetSec + (w.start ?? 0);
      const end = seg.offsetSec + (w.end ?? w.start ?? 0);
      words.push({
        id: crypto.randomUUID(),
        text,
        start,
        end: Math.max(end, start + 0.02),
      });
      if (end > durationSec) durationSec = end;
    }
    onProgress?.({ stage: 'transcribing', ratio: (i + 1) / segments.length });
  }

  return { words, durationSec };
}
