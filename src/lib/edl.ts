// Edit Decision List helpers. The transcript's words are the source of truth;
// deleted words define cut ranges. These functions turn the word list into the
// kept/cut time ranges the player and exporter operate on.
//
// Key principle: we only cut the time spanned by *contiguous runs of deleted
// words*. Everything else — including the natural pauses and silence between
// kept words — is preserved. So an unedited transcript exports byte-for-byte
// the same footage, and deleting words removes exactly those words (plus the
// silence trapped inside a deleted run).

import { Word, KeptSegment } from '@/types/video';

// Time ranges that have been cut out, one per contiguous run of deleted words.
export function buildCutRanges(words: Word[], durationSec = 0): KeptSegment[] {
  const cuts: KeptSegment[] = [];
  let i = 0;
  while (i < words.length) {
    if (!words[i].deleted) {
      i++;
      continue;
    }
    const start = words[i].start;
    let end = words[i].end;
    let j = i + 1;
    while (j < words.length && words[j].deleted) {
      end = Math.max(end, words[j].end);
      j++;
    }
    if (durationSec > 0) end = Math.min(end, durationSec);
    if (end > start) cuts.push({ start, end });
    i = j;
  }
  return cuts;
}

// The kept segments are the complement of the cut ranges over [0, duration].
export function buildKeptSegments(words: Word[], durationSec = 0): KeptSegment[] {
  if (durationSec <= 0) return [];
  const cuts = buildCutRanges(words, durationSec);
  const kept: KeptSegment[] = [];
  let cursor = 0;
  for (const cut of cuts) {
    if (cut.start > cursor) kept.push({ start: cursor, end: cut.start });
    cursor = Math.max(cursor, cut.end);
  }
  if (durationSec > cursor) kept.push({ start: cursor, end: durationSec });
  return kept.filter((s) => s.end - s.start > 0.01);
}

// Total runtime of the edited result.
export function editedDuration(words: Word[], durationSec = 0): number {
  const cut = buildCutRanges(words, durationSec).reduce((sum, c) => sum + (c.end - c.start), 0);
  return Math.max(0, durationSec - cut);
}

// During playback, given the player's current time, return the time it should
// jump to in order to skip any cut range it has entered — or null if the
// current time is inside a kept segment (no skip needed).
export function nextPlayableTime(cutRanges: KeptSegment[], currentTime: number): number | null {
  for (const cut of cutRanges) {
    // A tiny tolerance avoids re-triggering at the exact boundary.
    if (currentTime >= cut.start - 0.02 && currentTime < cut.end - 0.02) {
      return cut.end;
    }
  }
  return null;
}
