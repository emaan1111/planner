// Types for the Video Studio (Descript-style transcript editor).

// A single transcribed word with its time range in the source media.
// `deleted` is the edit decision: deleted words are skipped on playback and
// trimmed out on export. Together the deleted words form the cut list (EDL).
export interface Word {
  id: string;
  text: string;
  start: number; // seconds
  end: number; // seconds
  deleted?: boolean;
}

export type VideoStatus = 'draft' | 'transcribing' | 'ready';

// 'upload' projects carry a local blob in IndexedDB (trim + export). 'youtube'
// projects were transcribed server-side from a URL — no local file, so the
// editor embeds the YouTube player and export is disabled.
export type VideoSource = 'upload' | 'youtube';

export interface VideoProject {
  id: string;
  title: string;
  status: VideoStatus;
  durationSec: number;
  fileName: string | null;
  words: Word[];
  source: VideoSource;
  sourceUrl: string | null;
  youtubeId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- YouTube transcription queue --------------------------------------------

export type JobStatus =
  | 'queued'
  | 'downloading'
  | 'transcribing'
  | 'done'
  | 'error'
  | 'canceled';

export interface TranscriptionJob {
  id: string;
  source: string;
  url: string;
  youtubeId: string | null;
  title: string | null;
  channel: string | null;
  status: JobStatus;
  stage: string | null;
  progress: number;
  durationSec: number;
  error: string | null;
  attempts: number;
  batchId: string | null;
  videoProjectId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Mirrors the server's resolver output (src/lib/youtube.ts).
export type ChannelTab = 'videos' | 'streams' | 'shorts';

export interface ResolvedVideo {
  youtubeId: string;
  title: string;
  url: string;
  durationSec: number;
  channel: string | null;
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

// A contiguous time range that survives editing (built by merging adjacent
// non-deleted words). The player plays these and skips the gaps; the exporter
// trims+concats them into the final file.
export interface KeptSegment {
  start: number;
  end: number;
}
