import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskColumn } from '@/types';
import { toast } from '@/components/ui/Toast';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function fetchTaskColumns(): Promise<TaskColumn[]> {
  const res = await fetch('/api/task-columns');
  if (!res.ok) throw new Error('Failed to fetch columns');
  const data = await res.json();
  return data.map((c: TaskColumn & { createdAt: string; updatedAt: string }) => ({
    ...c,
    options: Array.isArray(c.options) ? c.options : [],
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  }));
}

async function createTaskColumn(input: { name: string; type: TaskColumn['type']; options?: string[] }): Promise<TaskColumn> {
  const res = await fetch('/api/task-columns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create column');
  return res.json();
}

async function updateTaskColumn(id: string, updates: Partial<Pick<TaskColumn, 'name' | 'options' | 'width' | 'order'>>): Promise<TaskColumn> {
  const res = await fetch(`/api/task-columns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update column');
  return res.json();
}

async function deleteTaskColumn(id: string): Promise<void> {
  const res = await fetch(`/api/task-columns/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete column');
}

export const taskColumnKeys = {
  all: ['taskColumns'] as const,
};

export function useTaskColumns() {
  return useQuery({ queryKey: taskColumnKeys.all, queryFn: fetchTaskColumns });
}

export function useCreateTaskColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTaskColumn,
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to create column')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskColumnKeys.all }),
  });
}

export function useUpdateTaskColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<TaskColumn, 'name' | 'options' | 'width' | 'order'>> }) =>
      updateTaskColumn(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: taskColumnKeys.all });
      const previous = queryClient.getQueryData<TaskColumn[]>(taskColumnKeys.all);
      if (previous) {
        queryClient.setQueryData<TaskColumn[]>(
          taskColumnKeys.all,
          previous.map((c) => (c.id === id ? { ...c, ...updates } : c))
        );
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(taskColumnKeys.all, context.previous);
      toast.error(getErrorMessage(error, 'Failed to update column'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskColumnKeys.all }),
  });
}

export function useDeleteTaskColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTaskColumn,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskColumnKeys.all });
      const previous = queryClient.getQueryData<TaskColumn[]>(taskColumnKeys.all);
      if (previous) {
        queryClient.setQueryData<TaskColumn[]>(taskColumnKeys.all, previous.filter((c) => c.id !== id));
      }
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(taskColumnKeys.all, context.previous);
      toast.error(getErrorMessage(error, 'Failed to delete column'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskColumnKeys.all }),
  });
}
