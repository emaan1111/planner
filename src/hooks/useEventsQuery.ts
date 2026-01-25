import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlanEvent } from '@/types';
import { toast } from '@/components/ui/Toast';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// API functions
async function fetchEvents(): Promise<PlanEvent[]> {
  const response = await fetch('/api/events');
  if (!response.ok) throw new Error('Failed to fetch events');
  const data = await response.json();
  // Convert date strings to Date objects
  return data.map((event: PlanEvent & { startDate: string; endDate: string; createdAt: string; updatedAt: string }) => ({
    ...event,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
  }));
}

async function createEvent(event: Omit<PlanEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlanEvent> {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error('Failed to create event');
  const data = await response.json();
  return {
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

async function updateEvent(id: string, updates: Partial<PlanEvent>): Promise<PlanEvent> {
  const response = await fetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update event');
  const data = await response.json();
  return {
    ...data,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`/api/events/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete event');
}

// Query key factory
export const eventKeys = {
  all: ['events'] as const,
  detail: (id: string) => ['events', id] as const,
};

// Hook to fetch all events
export function useEvents() {
  return useQuery({
    queryKey: eventKeys.all,
    queryFn: fetchEvents,
  });
}

// Hook to create an event
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEvent,
    onMutate: async (newEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: eventKeys.all });
      
      // Snapshot previous value
      const previousEvents = queryClient.getQueryData<PlanEvent[]>(eventKeys.all) ?? [];
      
      // Optimistically add the new event
      const optimisticEvent: PlanEvent = {
        ...newEvent,
        id: 'temp-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      queryClient.setQueryData<PlanEvent[]>(eventKeys.all, [...previousEvents, optimisticEvent]);
      
      return { previousEvents };
    },
    onError: (_error, _newEvent, context) => {
      // Rollback on error
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.all, context.previousEvents);
      }
      toast.error(getErrorMessage(_error, 'Failed to create event'));
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

// Hook to update an event
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlanEvent> }) => 
      updateEvent(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.all });
      
      const previousEvents = queryClient.getQueryData<PlanEvent[]>(eventKeys.all);
      
      if (previousEvents) {
        queryClient.setQueryData<PlanEvent[]>(
          eventKeys.all,
          previousEvents.map((event) =>
            event.id === id ? { ...event, ...updates, updatedAt: new Date() } : event
          )
        );
      }
      
      return { previousEvents };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.all, context.previousEvents);
      }
      toast.error(getErrorMessage(_error, 'Failed to update event'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

// Hook to delete an event
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEvent,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: eventKeys.all });
      
      const previousEvents = queryClient.getQueryData<PlanEvent[]>(eventKeys.all);
      
      if (previousEvents) {
        queryClient.setQueryData<PlanEvent[]>(
          eventKeys.all,
          previousEvents.filter((event) => event.id !== id)
        );
      }
      
      return { previousEvents };
    },
    onError: (_error, _id, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(eventKeys.all, context.previousEvents);
      }
      toast.error(getErrorMessage(_error, 'Failed to delete event'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

// Hook to move an event (update start/end dates)
export function useMoveEvent() {
  const updateMutation = useUpdateEvent();
  
  return {
    ...updateMutation,
    mutate: (id: string, startDate: Date, endDate: Date) => {
      updateMutation.mutate({ id, updates: { startDate, endDate } });
    },
    mutateAsync: (id: string, startDate: Date, endDate: Date) => {
      return updateMutation.mutateAsync({ id, updates: { startDate, endDate } });
    },
  };
}

// Hook to duplicate an event
export function useDuplicateEvent() {
  const queryClient = useQueryClient();
  const createMutation = useCreateEvent();
  
  return {
    ...createMutation,
    mutate: (event: PlanEvent) => {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...eventData } = event;
      createMutation.mutate(eventData);
    },
    mutateAsync: async (event: PlanEvent) => {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...eventData } = event;
      return createMutation.mutateAsync(eventData);
    },
  };
}
