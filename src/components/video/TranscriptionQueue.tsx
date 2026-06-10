'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Download,
  Captions,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
  Clock,
  ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';
import {
  useTranscriptionJobs,
  useDeleteTranscriptionJob,
  useRetryTranscriptionJob,
} from '@/hooks/useTranscriptionJobs';
import { videoKeys } from '@/hooks/useVideoProjectsQuery';
import { JobStatus, TranscriptionJob } from '@/types/video';

const STATUS_META: Record<JobStatus, { label: string; icon: typeof Clock; cls: string }> = {
  queued: { label: 'Queued', icon: Clock, cls: 'text-gray-500' },
  downloading: { label: 'Downloading', icon: Download, cls: 'text-blue-500' },
  transcribing: { label: 'Transcribing', icon: Captions, cls: 'text-amber-500' },
  done: { label: 'Done', icon: CheckCircle2, cls: 'text-emerald-500' },
  error: { label: 'Failed', icon: AlertCircle, cls: 'text-red-500' },
  canceled: { label: 'Canceled', icon: X, cls: 'text-gray-400' },
};

function JobRow({ job }: { job: TranscriptionJob }) {
  const remove = useDeleteTranscriptionJob();
  const retry = useRetryTranscriptionJob();
  const meta = STATUS_META[job.status] ?? STATUS_META.queued;
  const Icon = meta.icon;
  const spinning = job.status === 'downloading' || job.status === 'transcribing';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
    >
      {spinning ? (
        <Loader2 className={clsx('w-4 h-4 animate-spin shrink-0', meta.cls)} />
      ) : (
        <Icon className={clsx('w-4 h-4 shrink-0', meta.cls)} />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
          {job.title || job.url}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className={meta.cls}>{job.stage || meta.label}</span>
          {job.status === 'transcribing' && job.progress > 0 && (
            <span>· {Math.round(job.progress * 100)}%</span>
          )}
          {job.status === 'error' && job.error && (
            <span className="truncate text-red-400" title={job.error}>· {job.error}</span>
          )}
        </div>
        {job.status === 'transcribing' && (
          <div className="mt-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.round(job.progress * 100)}%` }} />
          </div>
        )}
      </div>

      {job.status === 'done' && job.videoProjectId && (
        <Link
          href={`/transcribe/${job.videoProjectId}`}
          className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
        >
          Open <ArrowRight className="w-3 h-3" />
        </Link>
      )}
      {job.status === 'error' && (
        <button
          onClick={() => retry.mutate(job.id)}
          className="p-1.5 text-gray-400 hover:text-amber-500 shrink-0"
          title="Retry"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
      {!spinning && (
        <button
          onClick={() => remove.mutate(job.id)}
          className="p-1.5 text-gray-300 hover:text-red-500 shrink-0"
          title="Remove"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

export function TranscriptionQueue() {
  const { data: jobs = [] } = useTranscriptionJobs();
  const queryClient = useQueryClient();
  const knownDone = useRef<Set<string>>(new Set());

  // When a job finishes, refresh the project list so the new transcript appears.
  useEffect(() => {
    let isNew = false;
    for (const j of jobs) {
      if (j.status === 'done' && j.videoProjectId && !knownDone.current.has(j.id)) {
        knownDone.current.add(j.id);
        isNew = true;
      }
    }
    if (isNew) queryClient.invalidateQueries({ queryKey: videoKeys.all });
  }, [jobs, queryClient]);

  if (jobs.length === 0) return null;

  const active = jobs.filter((j) => ['queued', 'downloading', 'transcribing'].includes(j.status));

  return (
    <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <Captions className="w-4 h-4 text-red-500" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transcription queue</h2>
        {active.length > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {active.length} in progress
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">keeps running if you close this tab</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <AnimatePresence initial={false}>
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
