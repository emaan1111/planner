import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChannelTab,
  ResolveResult,
  ResolvedVideo,
  TranscriptionJob,
} from '@/types/video';
import { videoKeys } from '@/hooks/useVideoProjectsQuery';
import { toast } from '@/components/ui/Toast';

const ACTIVE: TranscriptionJob['status'][] = ['queued', 'downloading', 'transcribing'];

export const jobKeys = {
  all: ['transcription-jobs'] as const,
};

async function fetchJobs(): Promise<TranscriptionJob[]> {
  const res = await fetch('/api/transcription-jobs');
  if (!res.ok) throw new Error('Failed to load transcription jobs');
  return res.json();
}

// Poll the queue. While anything is active we poll every 3s; once idle we back
// off to 20s (the server keeps working regardless — this is just the view).
export function useTranscriptionJobs() {
  return useQuery({
    queryKey: jobKeys.all,
    queryFn: fetchJobs,
    refetchInterval: (query) => {
      const jobs = query.state.data as TranscriptionJob[] | undefined;
      const active = jobs?.some((j) => ACTIVE.includes(j.status));
      return active ? 3000 : 20000;
    },
    refetchIntervalInBackground: true,
  });
}

export interface ResolveInput {
  input: string;
  tab?: ChannelTab;
}

export function useResolveYoutube() {
  return useMutation<ResolveResult, Error, ResolveInput>({
    mutationFn: async ({ input, tab }) => {
      const res = await fetch('/api/youtube/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, tab }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not resolve that URL');
      return data as ResolveResult;
    },
  });
}

export type EnqueueItem = Pick<ResolvedVideo, 'url'> &
  Partial<Pick<ResolvedVideo, 'title' | 'youtubeId' | 'channel'>>;

export function useEnqueueTranscription() {
  const queryClient = useQueryClient();
  return useMutation<{ count: number }, Error, EnqueueItem[]>({
    mutationFn: async (items) => {
      const res = await fetch('/api/transcription-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start transcription');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteTranscriptionJob() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/transcription-jobs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove job');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.all }),
    onError: (e) => toast.error(e.message),
  });
}

export function useRetryTranscriptionJob() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/transcription-jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });
      if (!res.ok) throw new Error('Failed to retry job');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
    },
    onError: (e) => toast.error(e.message),
  });
}
