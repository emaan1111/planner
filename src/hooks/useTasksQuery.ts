import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import { toast } from '@/components/ui/Toast';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// API functions
async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('/api/tasks');
  if (!response.ok) throw new Error('Failed to fetch tasks');
  const data = await response.json();
  return data.map((task: Task & { dueDate?: string; createdAt: string; updatedAt: string }) => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  }));
}

async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error('Failed to create task');
  const data = await response.json();
  return {
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update task');
  const data = await response.json();
  return {
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete task');
}

async function reorderTasks(orderedIds: string[]): Promise<void> {
  const response = await fetch('/api/tasks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  if (!response.ok) throw new Error('Failed to reorder tasks');
}

// Query key factory
export const taskKeys = {
  all: ['tasks'] as const,
  detail: (id: string) => ['tasks', id] as const,
};

// Hook to fetch all tasks
export function useTasks() {
  return useQuery({
    queryKey: taskKeys.all,
    queryFn: fetchTasks,
  });
}

// Hook to create a task
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTask,
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.all) ?? [];
      const optimisticTask: Task = {
        ...newTask,
        id: 'temp-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      queryClient.setQueryData<Task[]>(taskKeys.all, [...previousTasks, optimisticTask]);
      
      return { previousTasks };
    },
    onError: (_error, _newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.all, context.previousTasks);
      }
      toast.error(getErrorMessage(_error, 'Failed to create task'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// Hook to update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) => 
      updateTask(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.all);
      
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          taskKeys.all,
          previousTasks.map((task) =>
            task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task
          )
        );
      }
      
      return { previousTasks };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.all, context.previousTasks);
      }
      toast.error(getErrorMessage(_error, 'Failed to update task'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// Hook to delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTask,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.all);
      
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          taskKeys.all,
          previousTasks.filter((task) => task.id !== id)
        );
      }
      
      return { previousTasks };
    },
    onError: (_error, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.all, context.previousTasks);
      }
      toast.error(getErrorMessage(_error, 'Failed to delete task'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// Hook to reorder tasks
export function useReorderTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: reorderTasks,
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.all);
      
      if (previousTasks) {
        // Reorder tasks based on orderedIds
        const taskMap = new Map(previousTasks.map(t => [t.id, t]));
        const reorderedTasks = orderedIds
          .map(id => taskMap.get(id))
          .filter((t): t is Task => t !== undefined);
        
        // Add any tasks not in orderedIds at the end
        const orderedSet = new Set(orderedIds);
        const remainingTasks = previousTasks.filter(t => !orderedSet.has(t.id));
        
        queryClient.setQueryData<Task[]>(
          taskKeys.all,
          [...reorderedTasks, ...remainingTasks].map((t, i) => ({ ...t, order: i }))
        );
      }
      
      return { previousTasks };
    },
    onError: (_error, _orderedIds, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.all, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
