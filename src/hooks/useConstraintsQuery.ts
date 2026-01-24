import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Constraint } from '@/types';

// API functions
async function fetchConstraints(): Promise<Constraint[]> {
  const response = await fetch('/api/constraints');
  if (!response.ok) throw new Error('Failed to fetch constraints');
  return response.json();
}

async function createConstraint(constraint: Omit<Constraint, 'id'>): Promise<Constraint> {
  const response = await fetch('/api/constraints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(constraint),
  });
  if (!response.ok) throw new Error('Failed to create constraint');
  return response.json();
}

async function updateConstraint(id: string, updates: Partial<Constraint>): Promise<Constraint> {
  const response = await fetch(`/api/constraints/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update constraint');
  return response.json();
}

async function deleteConstraint(id: string): Promise<void> {
  const response = await fetch(`/api/constraints/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete constraint');
}

// Query key factory
export const constraintKeys = {
  all: ['constraints'] as const,
};

// Hook to fetch all constraints
export function useConstraints() {
  return useQuery({
    queryKey: constraintKeys.all,
    queryFn: fetchConstraints,
  });
}

// Hook to create a constraint
export function useCreateConstraint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createConstraint,
    onMutate: async (newConstraint) => {
      await queryClient.cancelQueries({ queryKey: constraintKeys.all });
      
      const previousConstraints = queryClient.getQueryData<Constraint[]>(constraintKeys.all);
      
      if (previousConstraints) {
        const optimisticConstraint: Constraint = {
          ...newConstraint,
          id: 'temp-' + Date.now(),
        };
        queryClient.setQueryData<Constraint[]>(constraintKeys.all, [...previousConstraints, optimisticConstraint]);
      }
      
      return { previousConstraints };
    },
    onError: (_error, _newConstraint, context) => {
      if (context?.previousConstraints) {
        queryClient.setQueryData(constraintKeys.all, context.previousConstraints);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: constraintKeys.all });
    },
  });
}

// Hook to update a constraint
export function useUpdateConstraint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Constraint> }) => 
      updateConstraint(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: constraintKeys.all });
      
      const previousConstraints = queryClient.getQueryData<Constraint[]>(constraintKeys.all);
      
      if (previousConstraints) {
        queryClient.setQueryData<Constraint[]>(
          constraintKeys.all,
          previousConstraints.map((constraint) =>
            constraint.id === id ? { ...constraint, ...updates } : constraint
          )
        );
      }
      
      return { previousConstraints };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousConstraints) {
        queryClient.setQueryData(constraintKeys.all, context.previousConstraints);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: constraintKeys.all });
    },
  });
}

// Hook to delete a constraint
export function useDeleteConstraint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteConstraint,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: constraintKeys.all });
      
      const previousConstraints = queryClient.getQueryData<Constraint[]>(constraintKeys.all);
      
      if (previousConstraints) {
        queryClient.setQueryData<Constraint[]>(
          constraintKeys.all,
          previousConstraints.filter((constraint) => constraint.id !== id)
        );
      }
      
      return { previousConstraints };
    },
    onError: (_error, _id, context) => {
      if (context?.previousConstraints) {
        queryClient.setQueryData(constraintKeys.all, context.previousConstraints);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: constraintKeys.all });
    },
  });
}

// Hook to toggle a constraint's active status
export function useToggleConstraint() {
  const updateMutation = useUpdateConstraint();
  const { data: constraints } = useConstraints();
  
  return {
    ...updateMutation,
    mutate: (id: string) => {
      const constraint = constraints?.find((c) => c.id === id);
      if (constraint) {
        updateMutation.mutate({ id, updates: { isActive: !constraint.isActive } });
      }
    },
  };
}
