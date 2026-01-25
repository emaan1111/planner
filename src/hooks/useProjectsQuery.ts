import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, EventColor } from '@/types';

// API functions
async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects');
  if (!response.ok) throw new Error('Failed to fetch projects');
  const data = await response.json();
  return data.map((project: Project & { createdAt: string; updatedAt: string }) => ({
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  }));
}

async function createProject(project: { name: string; description?: string; color?: EventColor }): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!response.ok) throw new Error('Failed to create project');
  const data = await response.json();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update project');
  const data = await response.json();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete project');
}

// Query key factory
export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
};

// Hook to fetch all projects
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: fetchProjects,
  });
}

// Hook to create a project
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onMutate: async (newProject) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all });
      
      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.all);
      
      if (previousProjects) {
        const optimisticProject: Project = {
          ...newProject,
          id: 'temp-' + Date.now(),
          color: newProject.color ?? 'blue',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queryClient.setQueryData<Project[]>(projectKeys.all, [...previousProjects, optimisticProject]);
      }
      
      return { previousProjects };
    },
    onError: (_error, _newProject, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.all, context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

// Hook to update a project
export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) => 
      updateProject(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all });
      
      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.all);
      
      if (previousProjects) {
        queryClient.setQueryData<Project[]>(
          projectKeys.all,
          previousProjects.map((project) =>
            project.id === id ? { ...project, ...updates, updatedAt: new Date() } : project
          )
        );
      }
      
      return { previousProjects };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.all, context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

// Hook to delete a project
export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteProject,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all });
      
      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.all);
      
      if (previousProjects) {
        queryClient.setQueryData<Project[]>(
          projectKeys.all,
          previousProjects.filter((project) => project.id !== id)
        );
      }
      
      return { previousProjects };
    },
    onError: (_error, _id, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.all, context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
