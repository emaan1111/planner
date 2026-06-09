import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VideoProject, Word, VideoStatus } from '@/types/video';
import { toast } from '@/components/ui/Toast';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type RawProject = Omit<VideoProject, 'words' | 'createdAt' | 'updatedAt'> & {
  words: Word[] | null;
  createdAt: string;
  updatedAt: string;
};

function hydrate(raw: RawProject): VideoProject {
  return {
    ...raw,
    words: Array.isArray(raw.words) ? raw.words : [],
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

async function fetchProjects(): Promise<VideoProject[]> {
  const res = await fetch('/api/video-projects');
  if (!res.ok) throw new Error('Failed to fetch video projects');
  const data: RawProject[] = await res.json();
  return data.map(hydrate);
}

async function fetchProject(id: string): Promise<VideoProject> {
  const res = await fetch(`/api/video-projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch video project');
  return hydrate(await res.json());
}

export type CreateProjectInput = {
  title?: string;
  fileName?: string;
  durationSec?: number;
};

async function createProject(input: CreateProjectInput): Promise<VideoProject> {
  const res = await fetch('/api/video-projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create video project');
  return hydrate(await res.json());
}

export type ProjectUpdate = Partial<
  Pick<VideoProject, 'title' | 'words' | 'status' | 'durationSec' | 'fileName'>
>;

async function updateProject(id: string, updates: ProjectUpdate): Promise<VideoProject> {
  const res = await fetch(`/api/video-projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to save video project');
  return hydrate(await res.json());
}

async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/video-projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete video project');
}

export const videoKeys = {
  all: ['video-projects'] as const,
  detail: (id: string) => ['video-projects', id] as const,
};

export function useVideoProjects() {
  return useQuery({ queryKey: videoKeys.all, queryFn: fetchProjects });
}

export function useVideoProject(id: string) {
  return useQuery({
    queryKey: videoKeys.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });
}

export function useCreateVideoProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to create video project')),
  });
}

export function useUpdateVideoProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ProjectUpdate }) =>
      updateProject(id, updates),
    // Optimistically patch the cached detail + list so the UI never flickers.
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: videoKeys.detail(id) });
      const previousDetail = queryClient.getQueryData<VideoProject>(videoKeys.detail(id));
      const previousList = queryClient.getQueryData<VideoProject[]>(videoKeys.all);
      if (previousDetail) {
        queryClient.setQueryData<VideoProject>(videoKeys.detail(id), {
          ...previousDetail,
          ...updates,
          updatedAt: new Date(),
        });
      }
      if (previousList) {
        queryClient.setQueryData<VideoProject[]>(
          videoKeys.all,
          previousList.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p))
        );
      }
      return { previousDetail, previousList };
    },
    onError: (error, { id }, context) => {
      if (context?.previousDetail) queryClient.setQueryData(videoKeys.detail(id), context.previousDetail);
      if (context?.previousList) queryClient.setQueryData(videoKeys.all, context.previousList);
      toast.error(getErrorMessage(error, 'Failed to save video project'));
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
      queryClient.invalidateQueries({ queryKey: videoKeys.detail(id) });
    },
  });
}

export function useDeleteVideoProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to delete video project')),
  });
}

export type { VideoStatus };
