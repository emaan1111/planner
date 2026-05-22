'use client';

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useState, ReactNode } from 'react';
import { useCourses, useCreatePlacement } from '@/hooks/useScenariosQuery';
import { useScenariosStore } from '@/store/scenariosStore';
import { toast } from '@/components/ui/Toast';
import { CourseTemplate } from '@/types/scenarios';
import { colorClasses, EventColor } from '@/types';
import clsx from 'clsx';

interface ScenarioDndProviderProps {
  children: ReactNode;
}

export function ScenarioDndProvider({ children }: ScenarioDndProviderProps) {
  const { data: courses = [] } = useCourses();
  const { activeScenarioId } = useScenariosStore();
  const createPlacement = useCreatePlacement();
  const [activeCourse, setActiveCourse] = useState<CourseTemplate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const onDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    if (!id.startsWith('course-')) return;
    const courseId = id.replace('course-', '');
    const course = courses.find((c) => c.id === courseId);
    if (course) setActiveCourse(course);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCourse(null);
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (!activeId.startsWith('course-') || !overId.startsWith('scenario-day-')) return;

    if (!activeScenarioId) {
      toast.error('Select a scenario before dropping a course onto the calendar.');
      return;
    }

    const courseId = activeId.replace('course-', '');
    const dateIso = overId.replace('scenario-day-', '');
    const dropDate = new Date(dateIso);
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    createPlacement.mutate({
      scenarioId: activeScenarioId,
      courseTemplateId: course.id,
      startDate: dropDate,
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {children}
      <DragOverlay className="z-[9999]">
        {activeCourse && <CoursePreview course={activeCourse} />}
      </DragOverlay>
    </DndContext>
  );
}

function CoursePreview({ course }: { course: CourseTemplate }) {
  const mc = colorClasses[course.marketingColor as EventColor] ?? colorClasses.purple;
  const dc = colorClasses[course.deliveryColor as EventColor] ?? colorClasses.blue;
  return (
    <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg border-2 border-indigo-500 p-3 max-w-[220px]">
      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{course.name}</div>
      <div className="flex h-1.5 mt-2 rounded-full overflow-hidden bg-gray-100">
        <div className={clsx(mc.bg)} style={{ width: `${(course.marketingDurationDays / (course.marketingDurationDays + course.deliveryDurationDays)) * 100}%` }} />
        <div className={clsx(dc.bg)} style={{ width: `${(course.deliveryDurationDays / (course.marketingDurationDays + course.deliveryDurationDays)) * 100}%` }} />
      </div>
      <div className="text-[10px] text-gray-500 mt-1">
        {course.marketingDurationDays}d marketing + {course.deliveryDurationDays}d delivery
      </div>
    </div>
  );
}
