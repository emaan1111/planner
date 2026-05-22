import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinancialModel, ModelLine, ModelHeadcount } from '@/types/models';
import { toast } from '@/components/ui/Toast';

function err(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function reviveModel(raw: FinancialModel & { startMonth: string | Date; createdAt: string | Date; updatedAt: string | Date }): FinancialModel {
  return {
    ...raw,
    startMonth: new Date(raw.startMonth),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  } as FinancialModel;
}

function reviveLine(raw: ModelLine & { createdAt: string | Date; updatedAt: string | Date }): ModelLine {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  } as ModelLine;
}

function reviveHeadcount(raw: ModelHeadcount & { startMonth: string | Date; endMonth: string | Date | null; createdAt: string | Date; updatedAt: string | Date }): ModelHeadcount {
  return {
    ...raw,
    startMonth: new Date(raw.startMonth),
    endMonth: raw.endMonth ? new Date(raw.endMonth) : undefined,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  } as ModelHeadcount;
}

// ----------------------------------------------------------------------------
// Models
// ----------------------------------------------------------------------------

export const modelKeys = {
  all: ['models'] as const,
  detail: (id: string) => ['models', id] as const,
};

async function fetchModels(): Promise<FinancialModel[]> {
  const res = await fetch('/api/models');
  if (!res.ok) throw new Error('Failed to fetch models');
  return (await res.json()).map(reviveModel);
}

export function useModels() {
  return useQuery({ queryKey: modelKeys.all, queryFn: fetchModels });
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FinancialModel>) => {
      const payload: Record<string, unknown> = { ...input };
      if (input.startMonth instanceof Date) payload.startMonth = input.startMonth.toISOString();
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create model');
      return reviveModel(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to create model')),
    onSettled: () => qc.invalidateQueries({ queryKey: modelKeys.all }),
  });
}

export function useUpdateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FinancialModel> }) => {
      const payload: Record<string, unknown> = { ...updates };
      if (updates.startMonth instanceof Date) payload.startMonth = updates.startMonth.toISOString();
      const res = await fetch(`/api/models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update model');
      return reviveModel(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to update model')),
    onSettled: () => qc.invalidateQueries({ queryKey: modelKeys.all }),
  });
}

export function useDeleteModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/models/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete model');
    },
    onError: (e) => toast.error(err(e, 'Failed to delete model')),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: modelKeys.all });
      qc.invalidateQueries({ queryKey: lineKeys.all });
      qc.invalidateQueries({ queryKey: headcountKeys.all });
    },
  });
}

export function useDuplicateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, caseType }: { id: string; name?: string; caseType?: string }) => {
      const res = await fetch(`/api/models/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, caseType }),
      });
      if (!res.ok) throw new Error('Failed to duplicate model');
      return reviveModel(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to duplicate model')),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: modelKeys.all });
      qc.invalidateQueries({ queryKey: lineKeys.all });
      qc.invalidateQueries({ queryKey: headcountKeys.all });
    },
  });
}

// ----------------------------------------------------------------------------
// Lines (scoped per model)
// ----------------------------------------------------------------------------

export const lineKeys = {
  all: ['model-lines'] as const,
  forModel: (modelId: string) => ['model-lines', { modelId }] as const,
};

async function fetchLines(modelId?: string): Promise<ModelLine[]> {
  const url = modelId ? `/api/model-lines?modelId=${modelId}` : '/api/model-lines';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch lines');
  return (await res.json()).map(reviveLine);
}

export function useModelLines(modelId?: string) {
  return useQuery({
    queryKey: modelId ? lineKeys.forModel(modelId) : lineKeys.all,
    queryFn: () => fetchLines(modelId),
    enabled: modelId !== undefined,
  });
}

export function useCreateLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ModelLine> & { modelId: string }) => {
      const res = await fetch('/api/model-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create line');
      return reviveLine(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to create line')),
    onSettled: () => qc.invalidateQueries({ queryKey: lineKeys.all }),
  });
}

export function useUpdateLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ModelLine> }) => {
      const res = await fetch(`/api/model-lines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update line');
      return reviveLine(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to update line')),
    onSettled: () => qc.invalidateQueries({ queryKey: lineKeys.all }),
  });
}

export function useDeleteLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/model-lines/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete line');
    },
    onError: (e) => toast.error(err(e, 'Failed to delete line')),
    onSettled: () => qc.invalidateQueries({ queryKey: lineKeys.all }),
  });
}

// ----------------------------------------------------------------------------
// Headcount
// ----------------------------------------------------------------------------

export const headcountKeys = {
  all: ['model-headcount'] as const,
  forModel: (modelId: string) => ['model-headcount', { modelId }] as const,
};

async function fetchHeadcount(modelId?: string): Promise<ModelHeadcount[]> {
  const url = modelId ? `/api/model-headcount?modelId=${modelId}` : '/api/model-headcount';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch headcount');
  return (await res.json()).map(reviveHeadcount);
}

export function useModelHeadcount(modelId?: string) {
  return useQuery({
    queryKey: modelId ? headcountKeys.forModel(modelId) : headcountKeys.all,
    queryFn: () => fetchHeadcount(modelId),
    enabled: modelId !== undefined,
  });
}

export function useCreateHeadcount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ModelHeadcount> & { modelId: string }) => {
      const payload: Record<string, unknown> = { ...input };
      if (input.startMonth instanceof Date) payload.startMonth = input.startMonth.toISOString();
      if (input.endMonth instanceof Date) payload.endMonth = input.endMonth.toISOString();
      const res = await fetch('/api/model-headcount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create headcount');
      return reviveHeadcount(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to create headcount')),
    onSettled: () => qc.invalidateQueries({ queryKey: headcountKeys.all }),
  });
}

export function useUpdateHeadcount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ModelHeadcount> }) => {
      const payload: Record<string, unknown> = { ...updates };
      if (updates.startMonth instanceof Date) payload.startMonth = updates.startMonth.toISOString();
      if (updates.endMonth instanceof Date) payload.endMonth = updates.endMonth.toISOString();
      else if (updates.endMonth === null) payload.endMonth = null;
      const res = await fetch(`/api/model-headcount/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update headcount');
      return reviveHeadcount(await res.json());
    },
    onError: (e) => toast.error(err(e, 'Failed to update headcount')),
    onSettled: () => qc.invalidateQueries({ queryKey: headcountKeys.all }),
  });
}

export function useDeleteHeadcount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/model-headcount/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete headcount');
    },
    onError: (e) => toast.error(err(e, 'Failed to delete headcount')),
    onSettled: () => qc.invalidateQueries({ queryKey: headcountKeys.all }),
  });
}
