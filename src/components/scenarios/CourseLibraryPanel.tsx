'use client';

import { useDraggable } from '@dnd-kit/core';
import { useCourses, useDeleteCourse } from '@/hooks/useScenariosQuery';
import { useScenariosStore } from '@/store/scenariosStore';
import { CourseTemplate } from '@/types/scenarios';
import { colorClasses, EventColor } from '@/types';
import { BookOpen, GripVertical, Plus, Pencil, Trash2, DollarSign, Users, Calendar } from 'lucide-react';
import clsx from 'clsx';

export function CourseLibraryPanel() {
  const { data: courses = [] } = useCourses();
  const deleteCourse = useDeleteCourse();
  const { openCourseEditor } = useScenariosStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Course Library</h2>
        </div>
        <button
          onClick={() => openCourseEditor()}
          title="Add course"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {courses.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-6">
            <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p>No courses defined yet.</p>
            <button
              onClick={() => openCourseEditor()}
              className="mt-2 text-indigo-500 hover:text-indigo-600"
            >
              Add your first course
            </button>
          </div>
        )}
        {courses.map((c) => (
          <DraggableCourseCard
            key={c.id}
            course={c}
            onEdit={() => openCourseEditor(c.id)}
            onDelete={() => {
              if (confirm(`Delete course "${c.name}"? Existing placements remain.`)) {
                deleteCourse.mutate(c.id);
              }
            }}
          />
        ))}
      </div>

      <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-800">
        Drag a course onto the calendar to schedule it.
      </div>
    </div>
  );
}

interface DraggableCourseCardProps {
  course: CourseTemplate;
  onEdit: () => void;
  onDelete: () => void;
}

function DraggableCourseCard({ course, onEdit, onDelete }: DraggableCourseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `course-${course.id}`,
    data: { type: 'course', courseId: course.id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const marketingColor = colorClasses[course.marketingColor as EventColor] ?? colorClasses.purple;
  const deliveryColor = colorClasses[course.deliveryColor as EventColor] ?? colorClasses.blue;
  const totalDays = course.marketingDurationDays + course.deliveryDurationDays;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        'group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-grab active:cursor-grabbing touch-none transition-shadow',
        isDragging && 'opacity-50 shadow-xl',
        'hover:shadow-md',
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{course.name}</span>
          </div>
          {course.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{course.description}</p>
          )}

          {/* duration bar (marketing + delivery proportions) */}
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-gray-100 dark:bg-gray-700">
            <div
              className={clsx(marketingColor.bg)}
              style={{ width: `${(course.marketingDurationDays / totalDays) * 100}%` }}
              title={`${course.marketingDurationDays}d marketing`}
            />
            <div
              className={clsx(deliveryColor.bg)}
              style={{ width: `${(course.deliveryDurationDays / totalDays) * 100}%` }}
              title={`${course.deliveryDurationDays}d delivery`}
            />
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {course.marketingDurationDays + course.deliveryDurationDays}d
            </span>
            <span className="inline-flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {course.defaultPricePerChild.toFixed(0)}/child
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              ~{course.defaultProjectedRegistrations}
            </span>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Edit course"
          >
            <Pencil className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
            title="Delete course"
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
