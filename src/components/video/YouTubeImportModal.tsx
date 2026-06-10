'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Loader2,
  Youtube,
  Radio,
  Check,
  ListVideo,
  CheckSquare,
  Square,
  Moon,
} from 'lucide-react';
import clsx from 'clsx';
import {
  useResolveYoutube,
  useEnqueueTranscription,
  type EnqueueItem,
} from '@/hooks/useTranscriptionJobs';
import { ChannelTab, ResolveResult, ResolvedVideo } from '@/types/video';
import { toast } from '@/components/ui/Toast';

function fmtDur(sec: number): string {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

const LIVE_STATUSES = new Set(['is_live', 'was_live', 'post_live']);
function isLive(v: ResolvedVideo): boolean {
  return v.liveStatus != null && LIVE_STATUSES.has(v.liveStatus);
}

const TABS: { key: ChannelTab; label: string; icon: typeof ListVideo }[] = [
  { key: 'videos', label: 'Videos', icon: ListVideo },
  { key: 'streams', label: 'Live streams', icon: Radio },
  { key: 'shorts', label: 'Shorts', icon: Youtube },
];

export function YouTubeImportModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [tab, setTab] = useState<ChannelTab>('videos');
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const resolve = useResolveYoutube();
  const enqueue = useEnqueueTranscription();

  const videos: ResolvedVideo[] =
    result?.kind === 'channel'
      ? result.videos
      : result?.kind === 'video'
        ? [result.video]
        : [];

  const liveCount = useMemo(() => videos.filter(isLive).length, [videos]);

  const runResolve = async (nextTab: ChannelTab = tab) => {
    if (!input.trim()) return;
    try {
      const res = await resolve.mutateAsync({ input: input.trim(), tab: nextTab });
      setResult(res);
      if (res.kind === 'video') {
        // Single video: preselect it.
        setSelected(new Set([res.video.youtubeId]));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not resolve that URL');
      setResult(null);
    }
  };

  const switchTab = (next: ChannelTab) => {
    setTab(next);
    if (result?.kind === 'channel') runResolve(next);
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(videos.map((v) => v.youtubeId)));
  const selectLive = () => setSelected(new Set(videos.filter(isLive).map((v) => v.youtubeId)));
  const clearSel = () => setSelected(new Set());

  const startTranscription = async () => {
    const items: EnqueueItem[] = videos
      .filter((v) => selected.has(v.youtubeId))
      .map((v) => ({ url: v.url, title: v.title, youtubeId: v.youtubeId, channel: v.channel ?? undefined }));
    if (items.length === 0) return;
    try {
      const { count } = await enqueue.mutateAsync(items);
      toast.success(`Queued ${count} video${count === 1 ? '' : 's'} — they’ll transcribe in the background.`);
      onClose();
    } catch {
      /* toast handled in hook */
    }
  };

  const selectedCount = selected.size;
  const isChannel = result?.kind === 'channel';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Transcribe from YouTube</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* URL input */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runResolve()}
              placeholder="Paste a video URL, or a channel URL (e.g. youtube.com/@channel)"
              className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-red-400 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => runResolve()}
              disabled={!input.trim() || resolve.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {resolve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Look up
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <Moon className="w-3.5 h-3.5" />
            Transcription runs on the server — you can close this and it keeps going overnight.
          </p>
        </div>

        {/* Channel tabs */}
        {isChannel && (
          <div className="flex items-center gap-1 px-5 pt-3">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                  tab === key
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Selection toolbar */}
        {videos.length > 0 && isChannel && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-2 text-xs">
            <button onClick={selectAll} className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              Select all ({videos.length})
            </button>
            {liveCount > 0 && (
              <button onClick={selectLive} className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 text-rose-700 dark:text-rose-300">
                <Radio className="w-3 h-3" /> All live streams ({liveCount})
              </button>
            )}
            <button onClick={clearSel} className="px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              Clear
            </button>
            {result?.kind === 'channel' && result.truncated && (
              <span className="ml-auto text-gray-400">Showing the most recent 300</span>
            )}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 min-h-[120px]">
          <AnimatePresence mode="wait">
            {resolve.isPending ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-gray-400">
                <Youtube className="w-8 h-8 mb-3 text-gray-300 dark:text-gray-700" />
                Paste a YouTube video or channel URL above, then “Look up”.
              </div>
            ) : (
              <ul className="space-y-1">
                {videos.map((v) => {
                  const checked = selected.has(v.youtubeId);
                  return (
                    <li key={v.youtubeId}>
                      <button
                        onClick={() => toggle(v.youtubeId)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
                          checked ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-red-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-sm text-gray-800 dark:text-gray-200">{v.title}</span>
                          <span className="flex items-center gap-2 text-xs text-gray-400">
                            {isLive(v) && (
                              <span className="inline-flex items-center gap-1 text-rose-500">
                                <Radio className="w-3 h-3" /> live
                              </span>
                            )}
                            {v.durationSec > 0 && <span>{fmtDur(v.durationSec)}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <span className="text-sm text-gray-500">
            {selectedCount > 0 ? `${selectedCount} selected` : 'Nothing selected'}
          </span>
          <button
            onClick={startTranscription}
            disabled={selectedCount === 0 || enqueue.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {enqueue.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Transcribe {selectedCount > 0 ? selectedCount : ''}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
