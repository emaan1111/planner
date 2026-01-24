// API Service for database operations

const API_BASE = '/api';

// Generic fetch wrapper with error handling
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Events API
export const eventsApi = {
  getAll: (params?: { startDate?: string; endDate?: string; planTypes?: string[] }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.planTypes) searchParams.set('planTypes', params.planTypes.join(','));
    const query = searchParams.toString();
    return fetchApi<Event[]>(`/events${query ? `?${query}` : ''}`);
  },
  
  getById: (id: string) => fetchApi<Event>(`/events/${id}`),
  
  create: (data: CreateEventData) => 
    fetchApi<Event>('/events', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<CreateEventData>) => 
    fetchApi<Event>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string) => 
    fetchApi<{ success: boolean }>(`/events/${id}`, { method: 'DELETE' }),
};

// Tasks API
export const tasksApi = {
  getAll: (params?: { status?: string; linkedPlanType?: string; linkedEventId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.linkedPlanType) searchParams.set('linkedPlanType', params.linkedPlanType);
    if (params?.linkedEventId) searchParams.set('linkedEventId', params.linkedEventId);
    const query = searchParams.toString();
    return fetchApi<Task[]>(`/tasks${query ? `?${query}` : ''}`);
  },
  
  getById: (id: string) => fetchApi<Task>(`/tasks/${id}`),
  
  create: (data: CreateTaskData) => 
    fetchApi<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<CreateTaskData>) => 
    fetchApi<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string) => 
    fetchApi<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
};

// Decisions API
export const decisionsApi = {
  getAll: (params?: { status?: string; linkedPlanType?: string; linkedEventId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.linkedPlanType) searchParams.set('linkedPlanType', params.linkedPlanType);
    if (params?.linkedEventId) searchParams.set('linkedEventId', params.linkedEventId);
    const query = searchParams.toString();
    return fetchApi<Decision[]>(`/decisions${query ? `?${query}` : ''}`);
  },
  
  getById: (id: string) => fetchApi<Decision>(`/decisions/${id}`),
  
  create: (data: CreateDecisionData) => 
    fetchApi<Decision>('/decisions', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<CreateDecisionData>) => 
    fetchApi<Decision>(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string) => 
    fetchApi<{ success: boolean }>(`/decisions/${id}`, { method: 'DELETE' }),
};

// Plan Types API
export const planTypesApi = {
  getAll: () => fetchApi<PlanType[]>('/plan-types'),
  
  create: (data: CreatePlanTypeData) => 
    fetchApi<PlanType>('/plan-types', { method: 'POST', body: JSON.stringify(data) }),
  
  delete: (id: string) => 
    fetchApi<{ success: boolean }>(`/plan-types?id=${id}`, { method: 'DELETE' }),
};

// Constraints API
export const constraintsApi = {
  getAll: () => fetchApi<Constraint[]>('/constraints'),
  
  create: (data: CreateConstraintData) => 
    fetchApi<Constraint>('/constraints', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id: string, data: Partial<CreateConstraintData>) => 
    fetchApi<Constraint>(`/constraints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id: string) => 
    fetchApi<{ success: boolean }>(`/constraints/${id}`, { method: 'DELETE' }),
};

// Types for API
interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  planType: string;
  color: string;
  isAllDay: boolean;
  tags: string[];
  priority?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateEventData {
  title: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  planType: string;
  color: string;
  isAllDay?: boolean;
  tags?: string[];
  priority?: string;
  status?: string;
  notes?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  linkedPlanType?: string;
  linkedEventId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTaskData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date | string;
  linkedPlanType?: string;
  linkedEventId?: string;
}

interface Decision {
  id: string;
  title: string;
  description?: string;
  status: string;
  outcome?: string;
  linkedPlanType?: string;
  linkedEventId?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateDecisionData {
  title: string;
  description?: string;
  status?: string;
  outcome?: string;
  linkedPlanType?: string;
  linkedEventId?: string;
  decidedAt?: Date | string;
}

interface PlanType {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: string;
}

interface CreatePlanTypeData {
  name: string;
  label: string;
  color: string;
  icon?: string;
}

interface Constraint {
  id: string;
  name: string;
  type: string;
  description: string;
  rule: {
    type: string;
    params: Record<string, unknown>;
  };
  isActive: boolean;
}

interface CreateConstraintData {
  name: string;
  type: string;
  description: string;
  rule?: {
    type: string;
    params: Record<string, unknown>;
  };
  ruleType?: string;
  ruleParams?: Record<string, unknown>;
  isActive?: boolean;
}
