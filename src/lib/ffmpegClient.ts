// Client-side ffmpeg.wasm wrapper. Runs entirely in the browser — used to
// (1) extract a 16 kHz mono PCM track for Whisper transcription and
// (2) export the edited video by trimming + concatenating the kept segments.
//
// We deliberately load the *single-threaded* UMD core from a CDN so the app
// does NOT need SharedArrayBuffer / cross-origin-isolation (COOP+COEP) headers,
// which would otherwise complicate the rest of the site. Slower, but zero infra.

import type { FFmpeg } from '@ffmpeg/ffmpeg';
import type { KeptSegment } from '@/types/video';

const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

let ffmpegPromise: Promise<FFmpeg> | null = null;

export async function loadFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;
  ffmpegPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    const ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    return ffmpeg;
  })();
  return ffmpegPromise;
}

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : 'mp4';
}

// Extract a 16 kHz mono float32 PCM track from the video, ready to feed Whisper.
export async function extractAudioPCM(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<Float32Array> {
  const ffmpeg = await loadFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const inputName = `extract-in.${extOf(file.name)}`;
  const outputName = 'extract-out.raw';

  const onProg = ({ progress }: { progress: number }) => onProgress?.(Math.min(1, Math.max(0, progress)));
  if (onProgress) ffmpeg.on('progress', onProg);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    // -vn: drop video, resample to 16k mono, raw 32-bit float little-endian.
    await ffmpeg.exec(['-i', inputName, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', outputName]);
    const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
    // Copy into an aligned buffer before viewing as Float32.
    const aligned = new Uint8Array(data.length);
    aligned.set(data);
    return new Float32Array(aligned.buffer);
  } finally {
    if (onProgress) ffmpeg.off('progress', onProg);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}

// Export the edited video: trim each kept segment and concat them, re-encoding
// so arbitrary cut points stay frame-accurate. Returns an MP4 blob.
export async function exportEditedVideo(
  file: File,
  segments: KeptSegment[],
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  if (segments.length === 0) throw new Error('Nothing to export — every word has been cut.');
  const ffmpeg = await loadFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const inputName = `export-in.${extOf(file.name)}`;
  const outputName = 'export-out.mp4';

  const onProg = ({ progress }: { progress: number }) => onProgress?.(Math.min(1, Math.max(0, progress)));
  if (onProgress) ffmpeg.on('progress', onProg);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Build a filter graph that trims + resets timestamps per segment, then
    // concatenates all the pieces back into a single video+audio stream.
    const parts: string[] = [];
    const concatInputs: string[] = [];
    segments.forEach((seg, i) => {
      parts.push(
        `[0:v]trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`
      );
      parts.push(
        `[0:a]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`
      );
      concatInputs.push(`[v${i}][a${i}]`);
    });
    const filter = `${parts.join(';')};${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[outv][outa]`;

    await ffmpeg.exec([
      '-i', inputName,
      '-filter_complex', filter,
      '-map', '[outv]',
      '-map', '[outa]',
      '-preset', 'ultrafast',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      outputName,
    ]);

    const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
    const copy = new Uint8Array(data.length);
    copy.set(data);
    return new Blob([copy], { type: 'video/mp4' });
  } finally {
    if (onProgress) ffmpeg.off('progress', onProg);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
