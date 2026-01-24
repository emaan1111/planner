import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlanTypeConfig } from '@/types';

// API functions
async function fetchPlanTypes(): Promise<PlanTypeConfig[]> {
  const response = await fetch('/api/plan-types');
  if (!response.ok) throw new Error('Failed to fetch plan types');
  return response.json();
}

async function createPlanType(planType: Omit<PlanTypeConfig, 'id'>): Promise<PlanTypeConfig> {
  const response = await fetch('/api/plan-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planType),
  });
  if (!response.ok) throw new Error('Failed to create plan type');
  return response.json();
}

async function deletePlanType(id: string): Promise<void> {
  const response = await fetch(`/api/plan-types?id=${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete plan type');
}

// Query key factory
export const planTypeKeys = {
  all: ['planTypes'] as const,
};

// Hook to fetch all plan types
export function usePlanTypes() {
  return useQuery({
    queryKey: planTypeKeys.all,
    queryFn: fetchPlanTypes,
  });
}

// Hook to create a plan type
export function useCreatePlanType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPlanType,
    onMutate: async (newPlanType) => {
      await queryClient.cancelQueries({ queryKey: planTypeKeys.all });
      
      const previousPlanTypes = queryClient.getQueryData<PlanTypeConfig[]>(planTypeKeys.all);
      
      if (previousPlanTypes) {
        const optimisticPlanType: PlanTypeConfig = {
          ...newPlanType,
          id: 'temp-' + Date.now(),
        };
        queryClient.setQueryData<PlanTypeConfig[]>(planTypeKeys.all, [...previousPlanTypes, optimisticPlanType]);
      }
      
      return { previousPlanTypes };
    },
    onError: (_error, _newPlanType, context) => {
      if (context?.previousPlanTypes) {
        queryClient.setQueryData(planTypeKeys.all, context.previousPlanTypes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: planTypeKeys.all });
    },
  });
}

// Hook to delete a plan type
export function useDeletePlanType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePlanType,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: planTypeKeys.all });
      
      const previousPlanTypes = queryClient.getQueryData<PlanTypeConfig[]>(planTypeKeys.all);
      
      if (previousPlanTypes) {
        queryClient.setQueryData<PlanTypeConfig[]>(
          planTypeKeys.all,
          previousPlanTypes.filter((pt) => pt.id !== id)
        );
      }
      
      return { previousPlanTypes };
    },
    onError: (_error, _id, context) => {
      if (context?.previousPlanTypes) {
        queryClient.setQueryData(planTypeKeys.all, context.previousPlanTypes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: planTypeKeys.all });
    },
  });
}

// Utility hook to get plan type by name
export function useGetPlanTypeByName() {
  const { data: planTypes } = usePlanTypes();
  
  return (name: string): PlanTypeConfig | undefined => {
    return planTypes?.find((pt) => pt.name === name);
  };
}
