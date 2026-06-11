'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Project } from '@/types';
import { TaskColumnKey } from '@/lib/pm';
import { ProjectGroup } from './ProjectGroup';
import { SomedayGroup } from './SomedayGroup';

interface ProjectBoardProps {
  projects: Project[];
  tasksByProject: Map<string, Task[]>;
  noProjectTasks: Task[];
  somedayTasks: Task[];
  columns: TaskColumnKey[];
  categories: string[];
  typeOptions: string[];
  projectsById: Map<string, Project>;
  isCollapsed: (id: string) => boolean;
  onToggleCollapse: (id: string) => void;
  selectedTaskIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onArchiveTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
  onAddTask: (projectId: string | undefined, title: string) => void;
  onArchiveProject: (id: string) => void;
  onEditProject: (project: Project) => void;
  onReorderProjects: (orderedIds: string[]) => void;
  onReviveTask: (id: string) => void;
}

function SortableProjectGroup({ project, children }: { project: Project; children: (handle: { attributes: Record<string, unknown>; listeners: Record<string, unknown> }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes: attributes as unknown as Record<string, unknown>, listeners: (listeners ?? {}) as Record<string, unknown> })}
    </div>
  );
}

export function ProjectBoard({
  projects,
  tasksByProject,
  noProjectTasks,
  somedayTasks,
  columns,
  categories,
  typeOptions,
  projectsById,
  isCollapsed,
  onToggleCollapse,
  selectedTaskIds,
  onToggleSelect,
  onEditTask,
  onUpdateTask,
  onArchiveTask,
  onReorderTasks,
  onAddTask,
  onArchiveProject,
  onEditProject,
  onReorderProjects,
  onReviveTask,
}: ProjectBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderProjects(arrayMove(projects, oldIndex, newIndex).map((p) => p.id));
      }
    }
  };

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map((project) => (
            <SortableProjectGroup key={project.id} project={project}>
              {(handle) => (
                <ProjectGroup
                  id={project.id}
                  name={project.name}
                  color={project.color}
                  tasks={tasksByProject.get(project.id) ?? []}
                  columns={columns}
                  categories={categories}
                  typeOptions={typeOptions}
                  projectsById={projectsById}
                  collapsed={isCollapsed(project.id)}
                  onToggleCollapse={() => onToggleCollapse(project.id)}
                  selectedTaskIds={selectedTaskIds}
                  onToggleSelect={onToggleSelect}
                  onEditTask={onEditTask}
                  onUpdateTask={onUpdateTask}
                  onArchiveTask={onArchiveTask}
                  onReorderTasks={onReorderTasks}
                  onAddTask={(title) => onAddTask(project.id, title)}
                  onArchiveProject={() => onArchiveProject(project.id)}
                  onEditProject={() => onEditProject(project)}
                  dragHandleProps={activeId ? undefined : handle}
                />
              )}
            </SortableProjectGroup>
          ))}
        </SortableContext>
      </DndContext>

      {/* No-project group (not reorderable) */}
      {noProjectTasks.length > 0 && (
        <ProjectGroup
          id="__none__"
          name="No project"
          color="gray"
          tasks={noProjectTasks}
          columns={columns}
          categories={categories}
          typeOptions={typeOptions}
          projectsById={projectsById}
          collapsed={isCollapsed('__none__')}
          onToggleCollapse={() => onToggleCollapse('__none__')}
          selectedTaskIds={selectedTaskIds}
          onToggleSelect={onToggleSelect}
          onEditTask={onEditTask}
          onUpdateTask={onUpdateTask}
          onArchiveTask={onArchiveTask}
          onReorderTasks={onReorderTasks}
          onAddTask={(title) => onAddTask(undefined, title)}
        />
      )}

      {/* Someday */}
      <SomedayGroup
        tasks={somedayTasks}
        collapsed={isCollapsed('__someday__')}
        onToggleCollapse={() => onToggleCollapse('__someday__')}
        onRevive={onReviveTask}
        onArchive={onArchiveTask}
        onUpdate={onUpdateTask}
        onEdit={onEditTask}
      />
    </div>
  );
}
