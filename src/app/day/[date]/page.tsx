'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, isValid, startOfDay, endOfDay, isSameDay, isWithinInterval, addDays, subDays } from 'date-fns';
import { ArrowLeft, Plus, Calendar, Clock, Tag, CheckCircle2, Circle, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useEvents, useUpdateEvent } from '@/hooks/useEventsQuery';
import { useTasks } from '@/hooks/useTasksQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { useUIStore } from '@/store/uiStore';
import { colorClasses, PlanEvent, Task } from '@/types';
import { EventModal } from '@/components/modals/EventModal';
import { TaskModal } from '@/components/modals/TaskModal';
import { expandRecurringEvents } from '@/utils/recurrence';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { setHours, setMinutes, getHours, getMinutes, differenceInMinutes, addMinutes } from 'date-fns';

const getTaskStatusIcon = (status: Task['status']) => {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'scheduled':
      return <Circle className="w-4 h-4 text-purple-500 fill-purple-500" />;
    case 'in-progress':
      return <Circle className="w-4 h-4 text-blue-500 fill-blue-500" />;
    default:
      return <Circle className="w-4 h-4 text-gray-400" />;
  }
};

const getEventStatusBadge = (status?: PlanEvent['status']) => {
  if (!status || status === 'scheduled') return null;
  
  const styles = {
    'done': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'reschedule': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'no-action': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  };

  const labels = {
    'done': 'Done',
    'in-progress': 'In Progress',
    'reschedule': 'Reschedule',
    'no-action': 'No Action',
  };

  return (
    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap', styles[status as keyof typeof styles])}>
      {labels[status as keyof typeof labels]}
    </span>
  );
};

interface SortableEventCardProps {
  event: PlanEvent;
  planType: any;
  onClick: () => void;
}

function SortableEventCard({ event, planType, onClick }: SortableEventCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: event.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colors = colorClasses[event.color];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 hover:shadow-sm transition-shadow cursor-pointer relative group',
        isDragging && 'opacity-30 z-50'
      )}
    >
      <div 
        onClick={onClick}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 text-gray-400 hover:text-gray-600">
            <GripVertical className="w-4 h-4" />
          </div>
          <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', colors.bg)} />
          <div className="min-w-0">
            <h3 className={clsx(
              'text-sm font-semibold truncate',
              (event.status === 'done' || event.status === 'no-action') 
                ? 'text-gray-500 line-through dark:text-gray-400' 
                : 'text-gray-900 dark:text-white'
            )}>
              {event.title}
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {getEventStatusBadge(event.status)}
          {event.priority && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
              {event.priority}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {event.isAllDay
              ? 'All day'
              : `${format(event.startDate, 'h:mm a')} - ${format(event.endDate, 'h:mm a')}`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DayViewPage() {
  const params = useParams<{ date: string }>();
  const dateParam = params?.date ?? '';
  const parsedDate = useMemo(() => parseISO(dateParam), [dateParam]);
  const isValidDate = isValid(parsedDate);

  const { data: events = [] } = useEvents();
  const updateEventMutation = useUpdateEvent();
  const { data: tasks = [] } = useTasks();
  const { data: planTypes = [] } = usePlanTypes();
  const { openEventModal, setCurrentDate } = useUIStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const dayStart = useMemo(() => startOfDay(parsedDate), [parsedDate]);

  useEffect(() => {
    if (isValidDate) {
      setCurrentDate(parsedDate);
    }
  }, [isValidDate, parsedDate, setCurrentDate]);

  const planTypeMap = useMemo(() => {
    return new Map(planTypes.map((pt) => [pt.name, pt]));
  }, [planTypes]);

  const dayEvents = useMemo(() => {
    if (!isValidDate) return [] as PlanEvent[];
    
    const rangeStart = startOfDay(parsedDate);
    const rangeEnd = endOfDay(parsedDate);
    const expanded = expandRecurringEvents(events, rangeStart, rangeEnd);

    return expanded
      .filter((event) =>
        isWithinInterval(dayStart, { start: startOfDay(event.startDate), end: endOfDay(event.endDate) })
      )
      .sort((a, b) => {
        // Sort by status priority first
        const statusWeight: Record<string, number> = {
          'in-progress': 0,
          'scheduled': 1,
          'reschedule': 2,
          'no-action': 3,
          'done': 4
        };
        
        const weightA = statusWeight[a.status || 'scheduled'] ?? 1;
        const weightB = statusWeight[b.status || 'scheduled'] ?? 1;

        if (weightA !== weightB) {
          return weightA - weightB;
        }

        // Then by start time
        return a.startDate.getTime() - b.startDate.getTime();
      });
  }, [events, isValidDate, parsedDate, dayStart]);

  const dayTasks = useMemo(() => {
    if (!isValidDate) return [] as Task[];
    return tasks
      .filter((task) => task.dueDate && isSameDay(task.dueDate, dayStart))
      .sort((a, b) => a.status.localeCompare(b.status));
  }, [tasks, isValidDate, dayStart]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Find source and target events
      const oldIndex = dayEvents.findIndex((e) => e.id === active.id);
      const newIndex = dayEvents.findIndex((e) => e.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const sourceEvent = dayEvents[oldIndex];
        const targetEvent = dayEvents[newIndex];
        
        // Simpler UX: Swap the timings of the two events
        // This effectively "swaps" their slots in the day
        
        const sourceStart = new Date(sourceEvent.startDate);
        const sourceEnd = new Date(sourceEvent.endDate);
        const targetStart = new Date(targetEvent.startDate);
        const targetEnd = new Date(targetEvent.endDate);
        
        // Duration of source
        const sourceDuration = differenceInMinutes(sourceEnd, sourceStart);
        // Duration of target
        const targetDuration = differenceInMinutes(targetEnd, targetStart);

        // We can either:
        // 1. Swap EXACT times (Source takes Target's start/end)
        // 2. Swap START times but keep durations (Source takes Target's start, End = Start + SourceDuration)
        
        // Option 1 is cleaner for "slots". Option 2 is better for distinct tasks.
        // Let's go with Option 1: Swapping Time Slots fully.
        // This feels like reordering "blocks" on a calendar.
        
        // Update Source to Target's times
        await updateEventMutation.mutateAsync({
          id: sourceEvent.id,
          updates: {
            startDate: targetStart,
            endDate: targetEnd
          }
        });
        
        // Update Target to Source's times
        await updateEventMutation.mutateAsync({
          id: targetEvent.id,
          updates: {
            startDate: sourceStart,
            endDate: sourceEnd
          }
        });
      }
    }
  };

  if (!isValidDate) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Invalid date</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">We couldn&apos;t read that day.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-6 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to calendar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Day view</p>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/day/${format(subDays(parsedDate, 1), 'yyyy-MM-dd')}`}
                    className="p-1 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Previous day"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-400 hover:text-gray-900 dark:hover:text-white" />
                  </Link>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white min-w-[240px] text-center">
                    {format(parsedDate, 'EEEE, MMMM d, yyyy')}
                  </h1>
                  <Link
                    href={`/day/${format(addDays(parsedDate, 1), 'yyyy-MM-dd')}`}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Next day"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-400 hover:text-gray-900 dark:hover:text-white" />
                  </Link>
                </div>
              </div>
            </div>
            <button
              onClick={() => openEventModal(undefined, { startDate: dayStart, endDate: dayStart })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              Add event
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Events</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {dayEvents.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
              No events scheduled.
            </div>
          ) : (
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={dayEvents.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const planType = event.planType
                      ? planTypeMap.get(event.planType)
                      : null;
                    return (
                      <SortableEventCard
                        key={event.id}
                        event={event}
                        planType={planType}
                        onClick={() => openEventModal(event)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tasks due</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {dayTasks.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 text-center text-gray-500 dark:text-gray-400">
              No tasks due today.
            </div>
          ) : (
            <div className="space-y-2">
              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setEditingTask(task)}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-2 hover:shadow-sm transition-shadow cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div onClick={(e) => e.stopPropagation()}>
                      {getTaskStatusIcon(task.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={clsx(
                          'text-sm font-medium truncate',
                          task.status === 'done'
                            ? 'text-gray-400 line-through'
                            : 'text-gray-900 dark:text-white'
                        )}>
                          {task.title}
                        </h3>
                        {task.priority && (
                          <span className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
                            task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          )}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>

      <EventModal />
      
      {editingTask && (
        <TaskModal
          isOpen={!!editingTask}
          selectedTask={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
