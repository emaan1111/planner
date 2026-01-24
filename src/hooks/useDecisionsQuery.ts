import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyDecision } from '@/types';

// API functions
async function fetchDecisions(): Promise<KeyDecision[]> {
  const response = await fetch('/api/decisions');
  if (!response.ok) throw new Error('Failed to fetch decisions');
  const data = await response.json();
  return data.map((decision: KeyDecision & { decidedAt?: string; createdAt: string; updatedAt: string }) => ({
    ...decision,
    decidedAt: decision.decidedAt ? new Date(decision.decidedAt) : undefined,
    createdAt: new Date(decision.createdAt),
    updatedAt: new Date(decision.updatedAt),
  }));
}

async function createDecision(decision: Omit<KeyDecision, 'id' | 'createdAt' | 'updatedAt'>): Promise<KeyDecision> {
  const response = await fetch('/api/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decision),
  });
  if (!response.ok) throw new Error('Failed to create decision');
  const data = await response.json();
  return {
    ...data,
    decidedAt: data.decidedAt ? new Date(data.decidedAt) : undefined,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

async function updateDecision(id: string, updates: Partial<KeyDecision>): Promise<KeyDecision> {
  const response = await fetch(`/api/decisions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update decision');
  const data = await response.json();
  return {
    ...data,
    decidedAt: data.decidedAt ? new Date(data.decidedAt) : undefined,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

async function deleteDecision(id: string): Promise<void> {
  const response = await fetch(`/api/decisions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete decision');
}

// Query key factory
export const decisionKeys = {
  all: ['decisions'] as const,
  detail: (id: string) => ['decisions', id] as const,
};

// Hook to fetch all decisions
export function useDecisions() {
  return useQuery({
    queryKey: decisionKeys.all,
    queryFn: fetchDecisions,
  });
}

// Hook to create a decision
export function useCreateDecision() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createDecision,
    onMutate: async (newDecision) => {
      await queryClient.cancelQueries({ queryKey: decisionKeys.all });
      
      const previousDecisions = queryClient.getQueryData<KeyDecision[]>(decisionKeys.all);
      
      if (previousDecisions) {
        const optimisticDecision: KeyDecision = {
          ...newDecision,
          id: 'temp-' + Date.now(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData<KeyDecision[]>(decisionKeys.all, [...previousDecisions, optimisticDecision]);
      }
      
      return { previousDecisions };
    },
    onError: (_error, _newDecision, context) => {
      if (context?.previousDecisions) {
        queryClient.setQueryData(decisionKeys.all, context.previousDecisions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: decisionKeys.all });
    },
  });
}

// Hook to update a decision
export function useUpdateDecision() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<KeyDecision> }) => 
      updateDecision(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: decisionKeys.all });
      
      const previousDecisions = queryClient.getQueryData<KeyDecision[]>(decisionKeys.all);
      
      if (previousDecisions) {
        queryClient.setQueryData<KeyDecision[]>(
          decisionKeys.all,
          previousDecisions.map((decision) =>
            decision.id === id ? { ...decision, ...updates, updatedAt: new Date() } : decision
          )
        );
      }
      
      return { previousDecisions };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDecisions) {
        queryClient.setQueryData(decisionKeys.all, context.previousDecisions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: decisionKeys.all });
    },
  });
}

// Hook to delete a decision
export function useDeleteDecision() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteDecision,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: decisionKeys.all });
      
      const previousDecisions = queryClient.getQueryData<KeyDecision[]>(decisionKeys.all);
      
      if (previousDecisions) {
        queryClient.setQueryData<KeyDecision[]>(
          decisionKeys.all,
          previousDecisions.filter((decision) => decision.id !== id)
        );
      }
      
      return { previousDecisions };
    },
    onError: (_error, _id, context) => {
      if (context?.previousDecisions) {
        queryClient.setQueryData(decisionKeys.all, context.previousDecisions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: decisionKeys.all });
    },
  });
}
