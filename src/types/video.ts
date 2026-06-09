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

export interface VideoProject {
  id: string;
  title: string;
  status: VideoStatus;
  durationSec: number;
  fileName: string | null;
  words: Word[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// A contiguous time range that survives editing (built by merging adjacent
// non-deleted words). The player plays these and skips the gaps; the exporter
// trims+concats them into the final file.
export interface KeptSegment {
  start: number;
  end: number;
}
