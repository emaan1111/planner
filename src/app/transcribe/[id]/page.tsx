'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import clsx from 'clsx';
import {
  ArrowLeft,
  Upload,
  Wand2,
  Loader2,
  Download,
  Scissors,
  RotateCcw,
  Play,
  Pause,
  Youtube,
  ExternalLink,
} from 'lucide-react';
import { useVideoProject, useUpdateVideoProject } from '@/hooks/useVideoProjectsQuery';
import { getVideoBlob, saveVideoBlob } from '@/lib/videoBlobStore';
import { extractAudioPCM, exportEditedVideo } from '@/lib/ffmpegClient';
import { transcribeAudio } from '@/lib/transcribeClient';
import { buildCutRanges, buildKeptSegments, editedDuration, nextPlayableTime } from '@/lib/edl';
import { ToastContainer, toast } from '@/components/ui/Toast';
import { Word } from '@/types/video';
import { YouTubePlayer, type YouTubePlayerHandle } from '@/components/video/YouTubePlayer';

function fmt(sec: number): string {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Progress =
  | { kind: 'load'; ratio?: number; message: string }
  | { kind: 'extract'; ratio?: number; message: string }
  | { kind: 'transcribe'; ratio?: number; message: string };

// Group words into readable paragraphs, breaking on long pauses.
function paragraphsOf(words: Word[]): { word: Word; index: number }[][] {
  const paras: { word: Word; index: number }[][] = [];
  let current: { word: Word; index: number }[] = [];
  words.forEach((word, index) => {
    const prev = words[index - 1];
    if (prev && word.start - prev.end > 1.4 && current.length > 0) {
      paras.push(current);
      current = [];
    }
    current.push({ word, index });
  });
  if (current.length) paras.push(current);
  return paras;
}

export default function VideoEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: project, isLoading } = useVideoProject(id);
  const updateProject = useUpdateVideoProject();

  const videoRef = useRef<HTMLVideoElement>(null);
  const reattachRef = useRef<HTMLInputElement>(null);
  const ytRef = useRef<YouTubePlayerHandle>(null);

  const isYouTube = project?.source === 'youtube';

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [blobChecked, setBlobChecked] = useState(false);

  const [words, setWords] = useState<Word[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState('');

  const [progress, setProgress] = useState<Progress | null>(null);
  const [exportRatio, setExportRatio] = useState<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Selection over the transcript (inclusive word-index range).
  const [selection, setSelection] = useState<{ anchor: number; focus: number } | null>(null);

  const duration = project?.durationSec ?? 0;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate local state once the project loads.
  useEffect(() => {
    if (project && !hydrated) {
      setWords(project.words);
      setTitle(project.title);
      setHydrated(true);
    }
  }, [project, hydrated]);

  // Load the local video blob from IndexedDB.
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      const blob = await getVideoBlob(id);
      if (cancelled) return;
      if (blob) {
        const f = new File([blob], project?.fileName ?? 'video.mp4', { type: blob.type || 'video/mp4' });
        url = URL.createObjectURL(f);
        setFile(f);
        setVideoUrl(url);
      }
      setBlobChecked(true);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, project?.fileName]);

  // Persist word edits (debounced).
  const commitWords = useCallback(
    (next: Word[]) => {
      setWords(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateProject.mutate({ id, updates: { words: next } });
      }, 600);
    },
    [id, updateProject]
  );

  const cutRanges = useMemo(() => buildCutRanges(words, duration), [words, duration]);
  const keptSegments = useMemo(() => buildKeptSegments(words, duration), [words, duration]);
  const editedSec = useMemo(() => editedDuration(words, duration), [words, duration]);
  const deletedCount = useMemo(() => words.filter((w) => w.deleted).length, [words]);
  const paragraphs = useMemo(() => paragraphsOf(words), [words]);

  // Current word under the playhead (for highlighting).
  const currentWordId = useMemo(() => {
    const w = words.find((x) => !x.deleted && currentTime >= x.start && currentTime < x.end);
    return w?.id ?? null;
  }, [words, currentTime]);

  // EDL playback: skip cut ranges as they're reached.
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    const jump = nextPlayableTime(cutRanges, t);
    if (jump != null) {
      if (jump >= duration - 0.05) {
        video.pause();
        return;
      }
      video.currentTime = jump;
      return;
    }
    setCurrentTime(t);
  }, [cutRanges, duration]);

  const seekTo = useCallback(
    (time: number) => {
      if (isYouTube) {
        ytRef.current?.seekTo(time);
        setCurrentTime(time);
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = time;
      setCurrentTime(time);
    },
    [isYouTube]
  );

  const togglePlay = useCallback(() => {
    if (isYouTube) {
      if (isPlaying) ytRef.current?.pause();
      else ytRef.current?.play();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, [isYouTube, isPlaying]);

  // --- Transcription ----------------------------------------------------------
  const runTranscription = useCallback(async () => {
    if (!file) return;
    try {
      setProgress({ kind: 'extract', message: 'Extracting audio…' });
      await updateProject.mutateAsync({ id, updates: { status: 'transcribing' } });
      const pcm = await extractAudioPCM(file, (r) =>
        setProgress({ kind: 'extract', ratio: r, message: 'Extracting audio…' })
      );
      const result = await transcribeAudio(pcm, (p) =>
        setProgress({
          kind: p.stage === 'loading' ? 'load' : 'transcribe',
          ratio: p.ratio,
          message: p.message ?? 'Transcribing…',
        })
      );
      if (result.length === 0) {
        toast.error('No speech was detected in this video.');
        await updateProject.mutateAsync({ id, updates: { status: 'draft' } });
      } else {
        setWords(result);
        await updateProject.mutateAsync({ id, updates: { words: result, status: 'ready' } });
        toast.success(`Transcribed ${result.length} words.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Transcription failed');
      await updateProject.mutateAsync({ id, updates: { status: 'draft' } }).catch(() => {});
    } finally {
      setProgress(null);
    }
  }, [file, id, updateProject]);

  // --- Selection + cut/restore ------------------------------------------------
  const onWordClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      const word = words[index];
      if (e.shiftKey && selection) {
        setSelection({ anchor: selection.anchor, focus: index });
      } else {
        setSelection({ anchor: index, focus: index });
        if (!word.deleted) seekTo(word.start);
      }
    },
    [words, selection, seekTo]
  );

  const selectedRange = useMemo(() => {
    if (!selection) return null;
    return { lo: Math.min(selection.anchor, selection.focus), hi: Math.max(selection.anchor, selection.focus) };
  }, [selection]);

  const applyCut = useCallback(
    (restore: boolean) => {
      if (!selectedRange) return;
      const next = words.map((w, i) =>
        i >= selectedRange.lo && i <= selectedRange.hi ? { ...w, deleted: !restore } : w
      );
      commitWords(next);
    },
    [selectedRange, words, commitWords]
  );

  // Whether the current selection is entirely deleted (so the action restores).
  const selectionAllDeleted = useMemo(() => {
    if (!selectedRange) return false;
    for (let i = selectedRange.lo; i <= selectedRange.hi; i++) {
      if (!words[i]?.deleted) return false;
    }
    return true;
  }, [selectedRange, words]);

  const onTranscriptKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedRange) {
        e.preventDefault();
        applyCut(false);
      } else if (e.key === 'Escape') {
        setSelection(null);
      }
    },
    [selectedRange, applyCut]
  );

  // --- Export -----------------------------------------------------------------
  const runExport = useCallback(async () => {
    if (!file || keptSegments.length === 0) return;
    try {
      setExportRatio(0);
      const blob = await exportEditedVideo(file, keptSegments, (r) => setExportRatio(r));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'video').replace(/[^\w-]+/g, '_')}-edited.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported edited video.');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportRatio(null);
    }
  }, [file, keptSegments, title]);

  // --- Title save -------------------------------------------------------------
  const saveTitle = useCallback(() => {
    if (project && title.trim() && title !== project.title) {
      updateProject.mutate({ id, updates: { title: title.trim() } });
    }
  }, [project, title, id, updateProject]);

  // Re-attach a missing local video.
  const handleReattach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    await saveVideoBlob(id, f);
    const url = URL.createObjectURL(f);
    setFile(f);
    setVideoUrl(url);
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const busy = progress !== null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/transcribe" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="bg-transparent text-lg font-semibold text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-rose-400 rounded px-1 min-w-0 truncate"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              <div>
                {fmt(editedSec)} <span className="text-gray-300 dark:text-gray-600">/ {fmt(duration)}</span>
              </div>
              {deletedCount > 0 && <div className="text-rose-500">{deletedCount} words cut</div>}
            </div>
            {isYouTube ? (
              project.sourceUrl && (
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:border-red-400 transition-colors"
                >
                  <Youtube className="w-4 h-4 text-red-600" />
                  Open on YouTube
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>
              )
            ) : (
              <button
                onClick={runExport}
                disabled={exportRatio !== null || keptSegments.length === 0 || words.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {exportRatio !== null ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting {Math.round(exportRatio * 100)}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export MP4
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: video player */}
        <div className="lg:sticky lg:top-20 self-start">
          {isYouTube && project.youtubeId ? (
            <div className="bg-black rounded-xl overflow-hidden shadow-sm">
              <YouTubePlayer
                ref={ytRef}
                youtubeId={project.youtubeId}
                onTime={(t) => setCurrentTime(t)}
                onPlayingChange={setIsPlaying}
              />
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-900 text-gray-200 text-xs">
                <button onClick={togglePlay} className="p-1.5 hover:bg-gray-800 rounded">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <span className="tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
                <span className="ml-auto text-gray-400">click a word to jump there</span>
              </div>
            </div>
          ) : videoUrl ? (
            <div className="bg-black rounded-xl overflow-hidden shadow-sm">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full aspect-video bg-black"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls
              />
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-900 text-gray-200 text-xs">
                <button onClick={togglePlay} className="p-1.5 hover:bg-gray-800 rounded">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <span className="tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
                {deletedCount > 0 && (
                  <span className="ml-auto text-rose-400">cuts are skipped during playback</span>
                )}
              </div>
            </div>
          ) : blobChecked ? (
            <div className="flex flex-col items-center justify-center text-center aspect-video bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6">
              <Upload className="w-8 h-8 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                The local video for this project isn’t on this device.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Re-attach {project.fileName ? `"${project.fileName}"` : 'the original file'} to keep editing.
              </p>
              <button
                onClick={() => reattachRef.current?.click()}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg"
              >
                Re-attach video
              </button>
              <input ref={reattachRef} type="file" accept="video/*" className="hidden" onChange={handleReattach} />
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}

          {/* Cut/restore action bar */}
          {words.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {selectedRange ? (
                <button
                  onClick={() => applyCut(selectionAllDeleted)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    selectionAllDeleted
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300'
                  )}
                >
                  {selectionAllDeleted ? <RotateCcw className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
                  {selectionAllDeleted ? 'Restore selection' : 'Cut selection'}
                </button>
              ) : (
                <p className="text-xs text-gray-400">
                  Select words in the transcript, then cut them (or press Delete).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: transcript */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 min-h-[300px]">
          {words.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <Wand2 className="w-10 h-10 text-rose-400 mb-4" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">No transcript yet</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                Transcribe this video on-device with Whisper. The first run downloads the model
                (~150 MB) once; nothing is uploaded.
              </p>
              <button
                onClick={runTranscription}
                disabled={!file || busy}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {busy ? progress?.message : 'Transcribe video'}
              </button>
              {!file && blobChecked && (
                <p className="text-xs text-amber-500 mt-3">Re-attach the video first.</p>
              )}
            </div>
          ) : (
            <div
              tabIndex={0}
              onKeyDown={onTranscriptKeyDown}
              className="outline-none leading-relaxed text-[15px] text-gray-800 dark:text-gray-200 space-y-4 focus:ring-0"
            >
              {paragraphs.map((para, pi) => (
                <p key={pi}>
                  {para.map(({ word, index }) => {
                    const isSelected =
                      selectedRange != null && index >= selectedRange.lo && index <= selectedRange.hi;
                    const isCurrent = word.id === currentWordId;
                    return (
                      <span key={word.id}>
                        <span
                          onClick={(e) => onWordClick(index, e)}
                          className={clsx(
                            'cursor-pointer rounded px-0.5 transition-colors',
                            word.deleted && 'line-through text-gray-400 dark:text-gray-600 decoration-rose-400/70',
                            isSelected && 'bg-rose-200/70 dark:bg-rose-500/30',
                            !isSelected && isCurrent && 'bg-amber-200 dark:bg-amber-500/40',
                            !isSelected && !isCurrent && !word.deleted && 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          )}
                        >
                          {word.text}
                        </span>{' '}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transcription progress overlay */}
      {busy && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-4" />
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{progress?.message}</p>
            {progress?.ratio != null ? (
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${Math.round((progress.ratio ?? 0) * 100)}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-gray-400">This can take a little while on the first run…</p>
            )}
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
