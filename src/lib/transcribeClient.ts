// Client-side speech-to-text using Whisper via Transformers.js. Runs fully
// on-device (WebGPU when available, otherwise WASM) — no API key, no upload,
// the audio never leaves the browser. Produces word-level timestamps, which is
// what makes the transcript a controller for the video (Descript-style).

import type { Word } from '@/types/video';

// base.en is a good speed/accuracy balance for English; quantized for the web.
const MODEL_ID = 'Xenova/whisper-base.en';

export interface TranscribeProgress {
  // 'loading' while the model weights download, 'transcribing' while running.
  stage: 'loading' | 'transcribing';
  // 0..1 when known, otherwise undefined (indeterminate).
  ratio?: number;
  message?: string;
}

// Cache the pipeline so re-transcribing doesn't re-download the model.
let transcriberPromise: Promise<unknown> | null = null;

async function getTranscriber(onProgress?: (p: TranscribeProgress) => void) {
  if (transcriberPromise) return transcriberPromise;
  transcriberPromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // Allow remote model download from the HF hub CDN.
    env.allowLocalModels = false;

    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const device = hasWebGPU ? 'webgpu' : 'wasm';

    return pipeline('automatic-speech-recognition', MODEL_ID, {
      device: device as 'webgpu' | 'wasm',
      // Track weight download progress.
      progress_callback: (data: { status?: string; progress?: number; file?: string }) => {
        if (data.status === 'progress') {
          onProgress?.({
            stage: 'loading',
            ratio: typeof data.progress === 'number' ? data.progress / 100 : undefined,
            message: `Downloading model${data.file ? ` (${data.file})` : ''}…`,
          });
        }
      },
    });
  })();
  return transcriberPromise;
}

interface ASRChunk {
  text: string;
  timestamp: [number, number | null];
}

// Transcribe 16 kHz mono float32 PCM into timed words.
export async function transcribeAudio(
  pcm: Float32Array,
  onProgress?: (p: TranscribeProgress) => void
): Promise<Word[]> {
  const transcriber = (await getTranscriber(onProgress)) as (
    audio: Float32Array,
    opts: Record<string, unknown>
  ) => Promise<{ text: string; chunks?: ASRChunk[] }>;

  onProgress?.({ stage: 'transcribing', message: 'Transcribing…' });

  const output = await transcriber(pcm, {
    return_timestamps: 'word',
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const chunks = output.chunks ?? [];
  const words: Word[] = [];
  let prevEnd = 0;
  for (const chunk of chunks) {
    const text = chunk.text.trim();
    if (!text) continue;
    const start = chunk.timestamp[0] ?? prevEnd;
    // The final word sometimes has a null end; fall back to a short span.
    const end = chunk.timestamp[1] ?? start + 0.3;
    words.push({
      id: crypto.randomUUID(),
      text,
      start,
      end: Math.max(end, start + 0.02),
    });
    prevEnd = end;
  }
  return words;
}
