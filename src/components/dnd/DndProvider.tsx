'use client';

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin } from '@dnd-kit/core';
import { useState, ReactNode } from 'react';
import { Task } from '@/types';
import { useCreateEvent } from '@/hooks/useEventsQuery';
import { useTasks, useUpdateTask } from '@/hooks/useTasksQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { format, startOfDay } from 'date-fns';
import { GripVertical } from 'lucide-react';

interface DndProviderProps {
  children: ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { data: tasks = [] } = useTasks();
  const { data: planTypes = [] } = usePlanTypes();
  const createEventMutation = useCreateEvent();
  const updateTaskMutation = useUpdateTask();

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const dropId = over.id as string;

    // Check if dropped on a calendar day cell
    if (dropId.startsWith('calendar-day-')) {
      const dateStr = dropId.replace('calendar-day-', '');
      const task = tasks.find(t => t.id === taskId);
      
      if (task) {
        const dropDate = startOfDay(new Date(dateStr));
        
        // Find matching plan type for the task
        const planType = planTypes.find(pt => pt.name === task.linkedPlanType);
        
        // Create event from task with the task's plan type
        createEventMutation.mutate({
          title: task.title,
          description: task.description,
          planType: task.linkedPlanType || undefined,
          color: planType?.color || 'blue',
          startDate: dropDate,
          endDate: dropDate,
        });

        // Mark task as scheduled
        updateTaskMutation.mutate({
          id: taskId,
          updates: { status: 'scheduled' }
        });
      }
    }
  };

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      
      <DragOverlay>
        {activeTask && (
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-3 border-2 border-blue-500 max-w-[200px]">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {activeTask.title}
              </span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
