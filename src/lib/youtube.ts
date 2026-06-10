// Server-side YouTube helpers. Shell out to the `yt-dlp` binary rather than an
// npm wrapper so deployment is a single, well-understood system dependency
// (no postinstall binary downloads). The binary location is configurable via
// the YT_DLP_PATH env var and defaults to `yt-dlp` on PATH.
//
// This module is SERVER-ONLY: it uses node:child_process / node:fs and must
// never be imported from a client component.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const YT_DLP = process.env.YT_DLP_PATH || 'yt-dlp';

// yt-dlp output for a big channel can be many megabytes of JSON.
const MAX_BUFFER = 256 * 1024 * 1024;

// A channel can have hundreds of videos; cap how many we list at once.
const PLAYLIST_LIMIT = 300;

export type ChannelTab = 'videos' | 'streams' | 'shorts';

export interface ResolvedVideo {
  youtubeId: string;
  title: string;
  url: string;
  durationSec: number;
  channel: string | null;
  // 'is_live' (currently live), 'was_live' (past stream), 'not_live', or null.
  liveStatus: string | null;
}

export interface ResolvedChannel {
  kind: 'channel';
  title: string;
  tab: ChannelTab;
  videos: ResolvedVideo[];
  truncated: boolean;
}

export interface ResolvedSingle {
  kind: 'video';
  video: ResolvedVideo;
}

export type ResolveResult = ResolvedChannel | ResolvedSingle;

export class YtDlpMissingError extends Error {
  constructor() {
    super(
      'yt-dlp is not installed or not on PATH. Install it (e.g. `brew install yt-dlp`) ' +
        'or set YT_DLP_PATH to the binary location.'
    );
    this.name = 'YtDlpMissingError';
  }
}

function isMissingBinary(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}

async function runYtDlp(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(YT_DLP, args, { maxBuffer: MAX_BUFFER });
    return stdout;
  } catch (err) {
    if (isMissingBinary(err)) throw new YtDlpMissingError();
    // yt-dlp writes the useful message to stderr.
    const stderr = (err as { stderr?: string }).stderr;
    throw new Error(stderr?.trim() || (err instanceof Error ? err.message : 'yt-dlp failed'));
  }
}

// --- URL classification ------------------------------------------------------

const VIDEO_ID_RE = /(?:youtu\.be\/|v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/;

export function extractVideoId(url: string): string | null {
  const m = VIDEO_ID_RE.exec(url);
  return m ? m[1] : null;
}

function looksLikeChannel(url: string): boolean {
  return /youtube\.com\/(@|channel\/|c\/|user\/)/i.test(url);
}

// Strip an existing tab suffix and append the requested one, so the same
// channel URL can be re-listed under Videos / Live / Shorts.
function channelTabUrl(input: string, tab: ChannelTab): string {
  let base = input.trim().replace(/\/+$/, '');
  base = base.replace(/\/(videos|streams|shorts|featured|playlists|community|about)$/i, '');
  return `${base}/${tab}`;
}

function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

// --- Resolution --------------------------------------------------------------

interface FlatEntry {
  id?: string;
  title?: string;
  url?: string;
  duration?: number;
  live_status?: string;
  channel?: string;
  uploader?: string;
}

function entryToVideo(e: FlatEntry, channel: string | null): ResolvedVideo | null {
  const id = e.id && /^[A-Za-z0-9_-]{11}$/.test(e.id) ? e.id : extractVideoId(e.url ?? '');
  if (!id) return null;
  return {
    youtubeId: id,
    title: e.title?.trim() || id,
    url: watchUrl(id),
    durationSec: typeof e.duration === 'number' ? e.duration : 0,
    channel: e.channel ?? e.uploader ?? channel,
    liveStatus: e.live_status ?? null,
  };
}

// Resolve a single video URL into its metadata.
export async function resolveVideo(url: string): Promise<ResolvedVideo> {
  const stdout = await runYtDlp([
    '--dump-single-json',
    '--no-playlist',
    '--no-warnings',
    url,
  ]);
  const info = JSON.parse(stdout) as FlatEntry & { webpage_url?: string };
  const video = entryToVideo(info, info.channel ?? info.uploader ?? null);
  if (!video) throw new Error('Could not read this video. Is the URL correct and public?');
  return video;
}

// List a channel/playlist tab (flat, fast — no per-video network calls).
export async function listChannel(input: string, tab: ChannelTab): Promise<ResolvedChannel> {
  const target = looksLikeChannel(input) ? channelTabUrl(input, tab) : input;
  const stdout = await runYtDlp([
    '--dump-single-json',
    '--flat-playlist',
    '--no-warnings',
    '--playlist-end',
    String(PLAYLIST_LIMIT),
    target,
  ]);

  const root = JSON.parse(stdout) as {
    title?: string;
    channel?: string;
    uploader?: string;
    entries?: FlatEntry[];
  };
  const channelName = root.channel ?? root.uploader ?? root.title ?? null;
  const rawEntries = root.entries ?? [];
  const videos = rawEntries
    .map((e) => entryToVideo(e, channelName))
    .filter((v): v is ResolvedVideo => v !== null);

  return {
    kind: 'channel',
    title: root.title?.trim() || channelName || 'Channel',
    tab,
    videos,
    truncated: rawEntries.length >= PLAYLIST_LIMIT,
  };
}

// Top-level resolver used by the API: classify the input and fetch accordingly.
export async function resolveTarget(input: string, tab: ChannelTab = 'videos'): Promise<ResolveResult> {
  const trimmed = input.trim();
  if (looksLikeChannel(trimmed)) {
    return listChannel(trimmed, tab);
  }
  const id = extractVideoId(trimmed);
  if (id) {
    return { kind: 'video', video: await resolveVideo(watchUrl(id)) };
  }
  // Fall back to treating it as a playlist/list URL.
  if (/[?&]list=/.test(trimmed)) {
    return listChannel(trimmed, tab);
  }
  // Last resort: let yt-dlp try to interpret it as a single video.
  return { kind: 'video', video: await resolveVideo(trimmed) };
}

// --- Audio download ----------------------------------------------------------

export interface DownloadedAudio {
  filePath: string;
  workDir: string;
  durationSec: number;
}

// Download the best audio-only stream for a video into a fresh temp dir and
// return the file path. We deliberately do NOT re-encode here (yt-dlp just saves
// the raw bestaudio stream); the transcribe step segments + compresses it.
export async function downloadAudio(url: string): Promise<DownloadedAudio> {
  const workDir = await mkdtemp(path.join(tmpdir(), 'yt-transcribe-'));
  await runYtDlp([
    '-f',
    'bestaudio/best',
    '--no-playlist',
    '--no-warnings',
    '--no-part',
    '-o',
    path.join(workDir, 'source.%(ext)s'),
    url,
  ]);

  const files = (await readdir(workDir)).filter((f) => f.startsWith('source.'));
  if (files.length === 0) {
    throw new Error('Audio download produced no file.');
  }
  const filePath = path.join(workDir, files[0]);
  return { filePath, workDir, durationSec: 0 };
}
