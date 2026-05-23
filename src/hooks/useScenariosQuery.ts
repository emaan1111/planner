import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CourseTemplate,
  ScenarioFolder,
  Scenario,
  CoursePlacement,
  ScenarioEvent,
} from '@/types/scenarios';
import { toast } from '@/components/ui/Toast';

function err(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function reviveDates<T extends { createdAt: string | Date; updatedAt: string | Date }>(raw: T) {
  return { ...raw, createdAt: new Date(raw.createdAt), updatedAt: new Date(raw.updatedAt) };
}

// -----------------------------------------------------------------------------
// Courses
// -----------------------------------------------------------------------------

export const courseKeys = {
  all: ['courses'] as const,
};

async function fetchCourses(): Promise<CourseTemplate[]> {
  const res = await fetch('/api/courses');
  if (!res.ok) throw new Error('Failed to fetch courses');
  const data = await res.json();
  return data.map(reviveDates);
}

export function useCourses() {
  return useQuery({ queryKey: courseKeys.all, queryFn: fetchCourses });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CourseTemplate>) => {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create course');
      return reviveDates(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to create course')),
    onSettled: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CourseTemplate> }) => {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update course');
      return reviveDates(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to update course')),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: courseKeys.all });
      qc.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete course');
    },
    onError: (e) => toast.error(err(e, 'Failed to delete course')),
    onSettled: () => qc.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

// -----------------------------------------------------------------------------
// Scenario folders
// -----------------------------------------------------------------------------

export const folderKeys = {
  all: ['scenario-folders'] as const,
};

async function fetchFolders(): Promise<ScenarioFolder[]> {
  const res = await fetch('/api/scenario-folders');
  if (!res.ok) throw new Error('Failed to fetch folders');
  return (await res.json()).map(reviveDates);
}

export function useScenarioFolders() {
  return useQuery({ queryKey: folderKeys.all, queryFn: fetchFolders });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ScenarioFolder>) => {
      const res = await fetch('/api/scenario-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create folder');
      return reviveDates(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to create folder')),
    onSettled: () => qc.invalidateQueries({ queryKey: folderKeys.all }),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScenarioFolder> }) => {
      const res = await fetch(`/api/scenario-folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update folder');
      return reviveDates(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to update folder')),
    onSettled: () => qc.invalidateQueries({ queryKey: folderKeys.all }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/scenario-folders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete folder');
    },
    onError: (e) => toast.error(err(e, 'Failed to delete folder')),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: folderKeys.all });
      qc.invalidateQueries({ queryKey: scenarioKeys.all });
    },
  });
}

// -----------------------------------------------------------------------------
// Scenarios
// -----------------------------------------------------------------------------

export const scenarioKeys = {
  all: ['scenarios'] as const,
  detail: (id: string) => ['scenarios', id] as const,
};

async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch('/api/scenarios');
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return (await res.json()).map(reviveDates);
}

export function useScenarios() {
  return useQuery({ queryKey: scenarioKeys.all, queryFn: fetchScenarios });
}

export function useCreateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Scenario>) => {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create scenario');
      return reviveDates(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to create scenario')),
    onSettled: () => qc.invalidateQueries({ queryKey: scenarioKeys.all }),
  });
}

export function useUpdateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Scenario> }) => {
      const res = await fetch(`/api/scenarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update scenario');
      return reviveDates(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to update scenario')),
    onSettled: () => qc.invalidateQueries({ queryKey: scenarioKeys.all }),
  });
}

// Reorders scenarios within a single bucket (folder or unfiled). The caller passes
// the new ordering as { id, order } pairs; only entries whose order actually
// changes are sent to the server. Cache is updated optimistically so the list
// snaps immediately and never flickers between settles.
export function useReorderScenarios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; order: number }[]) => {
      const changed = items.filter((it) => {
        const cached = qc
          .getQueryData<Scenario[]>(scenarioKeys.all)
          ?.find((s) => s.id === it.id);
        return cached?.order !== it.order;
      });
      qc.setQueryData<Scenario[]>(scenarioKeys.all, (prev) => {
        if (!prev) return prev;
        const byId = new Map(items.map((it) => [it.id, it.order]));
        return prev
          .map((s) => (byId.has(s.id) ? { ...s, order: byId.get(s.id)! } : s))
          .sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
      });
      await Promise.all(
        changed.map((it) =>
          fetch(`/api/scenarios/${it.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: it.order }),
          }),
        ),
      );
    },
    onError: (e) => toast.error(err(e, 'Failed to reorder scenarios')),
    onSettled: () => qc.invalidateQueries({ queryKey: scenarioKeys.all }),
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete scenario');
    },
    onError: (e) => toast.error(err(e, 'Failed to delete scenario')),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: scenarioKeys.all });
      qc.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}

export function useDuplicateScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, folderId }: { id: string; name?: string; folderId?: string | null }) => {
      const res = await fetch(`/api/scenarios/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, folderId }),
      });
      if (!res.ok) throw new Error('Failed to duplicate scenario');
      return reviveDates(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to duplicate scenario')),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: scenarioKeys.all });
      qc.invalidateQueries({ queryKey: placementKeys.all });
    },
  });
}

// -----------------------------------------------------------------------------
// Placements (scoped per scenario)
// -----------------------------------------------------------------------------

export const placementKeys = {
  all: ['placements'] as const,
  forScenario: (scenarioId: string) => ['placements', { scenarioId }] as const,
};

function revivePlacement(raw: CoursePlacement & { createdAt: string | Date; updatedAt: string | Date; startDate: string | Date; deliveryStartDate: string | Date }) {
  return {
    ...raw,
    startDate: new Date(raw.startDate),
    deliveryStartDate: new Date(raw.deliveryStartDate),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    courseTemplate: raw.courseTemplate ? reviveDates(raw.courseTemplate) : undefined,
  } as CoursePlacement;
}

async function fetchPlacements(scenarioId?: string): Promise<CoursePlacement[]> {
  const url = scenarioId ? `/api/placements?scenarioId=${scenarioId}` : '/api/placements';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch placements');
  return (await res.json()).map(revivePlacement);
}

export function usePlacements(scenarioId?: string) {
  return useQuery({
    queryKey: scenarioId ? placementKeys.forScenario(scenarioId) : placementKeys.all,
    queryFn: () => fetchPlacements(scenarioId),
    enabled: scenarioId !== undefined,
  });
}

// All placements across every scenario — used by the sidebar revenue toggle.
export function useAllPlacements(enabled: boolean = true) {
  return useQuery({
    queryKey: placementKeys.all,
    queryFn: () => fetchPlacements(),
    enabled,
  });
}

export function useCreatePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      scenarioId: string;
      courseTemplateId: string;
      startDate: Date;
      deliveryStartDate?: Date;
      gapDays?: number;
      marketingDurationDays?: number;
      deliveryDurationDays?: number;
      pricePerChild?: number;
      costPerRun?: number;
      projectedRegistrations?: number;
      likelihoodPercent?: number;
      risks?: string;
      notes?: string;
      isMembership?: boolean;
      monthlyChurnPercent?: number;
      retentionMonths?: number;
      entryMode?: 'direct' | 'trial-to-paid';
      trialDurationDays?: number;
      trialToPaidConversionPercent?: number;
    }) => {
      const payload: Record<string, unknown> = {
        ...input,
        startDate: input.startDate.toISOString(),
      };
      if (input.deliveryStartDate) payload.deliveryStartDate = input.deliveryStartDate.toISOString();
      const res = await fetch('/api/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create placement');
      return revivePlacement(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to create placement')),
    onSettled: () => qc.invalidateQueries({ queryKey: placementKeys.all }),
  });
}

export function useUpdatePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CoursePlacement> }) => {
      const payload: Record<string, unknown> = { ...updates };
      if (updates.startDate instanceof Date) payload.startDate = updates.startDate.toISOString();
      if (updates.deliveryStartDate instanceof Date) payload.deliveryStartDate = updates.deliveryStartDate.toISOString();
      const res = await fetch(`/api/placements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update placement');
      return revivePlacement(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to update placement')),
    onSettled: () => qc.invalidateQueries({ queryKey: placementKeys.all }),
  });
}

export function useDeletePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/placements/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete placement');
    },
    onError: (e) => toast.error(err(e, 'Failed to delete placement')),
    onSettled: () => qc.invalidateQueries({ queryKey: placementKeys.all }),
  });
}

// Apply an update to every placement of a course across all scenarios.
export function useBulkUpdatePlacements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseTemplateId,
      updates,
    }: {
      courseTemplateId: string;
      updates: Partial<CoursePlacement>;
    }) => {
      const res = await fetch('/api/placements/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseTemplateId, updates }),
      });
      if (!res.ok) throw new Error('Failed to bulk update placements');
      return res.json();
    },
    onError: (e) => toast.error(err(e, 'Failed to apply across all calendars')),
    onSettled: () => qc.invalidateQueries({ queryKey: placementKeys.all }),
  });
}

// -----------------------------------------------------------------------------
// Scenario events (holidays, key dates, ad-hoc notes pinned to a scenario)
// -----------------------------------------------------------------------------

export const scenarioEventKeys = {
  all: ['scenario-events'] as const,
  forScenario: (scenarioId: string) => ['scenario-events', { scenarioId }] as const,
};

function reviveScenarioEvent(raw: ScenarioEvent & { createdAt: string | Date; updatedAt: string | Date; startDate: string | Date; endDate: string | Date }): ScenarioEvent {
  return {
    ...raw,
    startDate: new Date(raw.startDate),
    endDate: new Date(raw.endDate),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  } as ScenarioEvent;
}

async function fetchScenarioEvents(scenarioId?: string): Promise<ScenarioEvent[]> {
  const url = scenarioId ? `/api/scenario-events?scenarioId=${scenarioId}` : '/api/scenario-events';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch scenario events');
  return (await res.json()).map(reviveScenarioEvent);
}

export function useScenarioEvents(scenarioId?: string) {
  return useQuery({
    queryKey: scenarioId ? scenarioEventKeys.forScenario(scenarioId) : scenarioEventKeys.all,
    queryFn: () => fetchScenarioEvents(scenarioId),
    enabled: scenarioId !== undefined,
  });
}

export function useCreateScenarioEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { scenarioId: string; title: string; startDate: Date; endDate?: Date; color?: string; kind?: ScenarioEvent['kind']; notes?: string }) => {
      const res = await fetch('/api/scenario-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          startDate: input.startDate.toISOString(),
          endDate: (input.endDate ?? input.startDate).toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to create scenario event');
      return reviveScenarioEvent(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to create event')),
    onSettled: () => qc.invalidateQueries({ queryKey: scenarioEventKeys.all }),
  });
}

export function useUpdateScenarioEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScenarioEvent> }) => {
      const payload: Record<string, unknown> = { ...updates };
      if (updates.startDate instanceof Date) payload.startDate = updates.startDate.toISOString();
      if (updates.endDate instanceof Date) payload.endDate = updates.endDate.toISOString();
      const res = await fetch(`/api/scenario-events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update scenario event');
      return reviveScenarioEvent(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to update event')),
    onSettled: () => qc.invalidateQueries({ queryKey: scenarioEventKeys.all }),
  });
}

export function useDeleteScenarioEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/scenario-events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete scenario event');
    },
    onError: (e) => toast.error(err(e, 'Failed to delete event')),
    onSettled: () => qc.invalidateQueries({ queryKey: scenarioEventKeys.all }),
  });
}
