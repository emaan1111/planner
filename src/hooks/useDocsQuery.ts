import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Doc, DocBlock } from '@/types/docs';
import { toast } from '@/components/ui/Toast';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type RawDoc = Omit<Doc, 'blocks' | 'createdAt' | 'updatedAt'> & {
  blocks: DocBlock[] | null;
  createdAt: string;
  updatedAt: string;
};

function hydrate(raw: RawDoc): Doc {
  return {
    ...raw,
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

async function fetchDocs(): Promise<Doc[]> {
  const res = await fetch('/api/docs');
  if (!res.ok) throw new Error('Failed to fetch documents');
  const data: RawDoc[] = await res.json();
  return data.map(hydrate);
}

async function fetchDoc(id: string): Promise<Doc> {
  const res = await fetch(`/api/docs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return hydrate(await res.json());
}

async function createDoc(input: { title?: string; blocks?: DocBlock[] }): Promise<Doc> {
  const res = await fetch('/api/docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create document');
  return hydrate(await res.json());
}

async function updateDoc(id: string, updates: Partial<Pick<Doc, 'title' | 'blocks'>>): Promise<Doc> {
  const res = await fetch(`/api/docs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to save document');
  return hydrate(await res.json());
}

async function deleteDoc(id: string): Promise<void> {
  const res = await fetch(`/api/docs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
}

export const docKeys = {
  all: ['docs'] as const,
  detail: (id: string) => ['docs', id] as const,
};

export function useDocs() {
  return useQuery({ queryKey: docKeys.all, queryFn: fetchDocs });
}

export function useDoc(id: string) {
  return useQuery({
    queryKey: docKeys.detail(id),
    queryFn: () => fetchDoc(id),
    enabled: !!id,
  });
}

export function useCreateDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDoc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to create document')),
  });
}

export function useUpdateDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Doc, 'title' | 'blocks'>> }) =>
      updateDoc(id, updates),
    // Optimistically patch the cached detail + list so the UI never flickers.
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: docKeys.detail(id) });
      const previousDetail = queryClient.getQueryData<Doc>(docKeys.detail(id));
      const previousList = queryClient.getQueryData<Doc[]>(docKeys.all);
      if (previousDetail) {
        queryClient.setQueryData<Doc>(docKeys.detail(id), { ...previousDetail, ...updates, updatedAt: new Date() });
      }
      if (previousList) {
        queryClient.setQueryData<Doc[]>(
          docKeys.all,
          previousList.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: new Date() } : d))
        );
      }
      return { previousDetail, previousList };
    },
    onError: (error, { id }, context) => {
      if (context?.previousDetail) queryClient.setQueryData(docKeys.detail(id), context.previousDetail);
      if (context?.previousList) queryClient.setQueryData(docKeys.all, context.previousList);
      toast.error(getErrorMessage(error, 'Failed to save document'));
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: docKeys.all });
      queryClient.invalidateQueries({ queryKey: docKeys.detail(id) });
    },
  });
}

export function useDeleteDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDoc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docKeys.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to delete document')),
  });
}
