'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, isValid, startOfDay, endOfDay, isSameDay, isWithinInterval } from 'date-fns';
import { ArrowLeft, Plus, Calendar, Clock, Tag, CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';
import { useEvents } from '@/hooks/useEventsQuery';
import { useTasks } from '@/hooks/useTasksQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { useUIStore } from '@/store/uiStore';
import { colorClasses, PlanEvent, Task } from '@/types';
import { EventModal } from '@/components/modals/EventModal';

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

export default function DayViewPage() {
  const params = useParams<{ date: string }>();
  const dateParam = params?.date ?? '';
  const parsedDate = useMemo(() => parseISO(dateParam), [dateParam]);
  const isValidDate = isValid(parsedDate);

  const { data: events = [] } = useEvents();
  const { data: tasks = [] } = useTasks();
  const { data: planTypes = [] } = usePlanTypes();
  const { openEventModal, setCurrentDate } = useUIStore();

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
    return events
      .filter((event) =>
        isWithinInterval(dayStart, { start: startOfDay(event.startDate), end: endOfDay(event.endDate) })
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events, isValidDate, dayStart]);

  const dayTasks = useMemo(() => {
    if (!isValidDate) return [] as Task[];
    return tasks
      .filter((task) => task.dueDate && isSameDay(task.dueDate, dayStart))
      .sort((a, b) => a.status.localeCompare(b.status));
  }, [tasks, isValidDate, dayStart]);

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
                <p className="text-sm text-gray-500 dark:text-gray-400">Day view</p>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {format(parsedDate, 'EEEE, MMMM d, yyyy')}
                </h1>
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
            <div className="space-y-3">
              {dayEvents.map((event) => {
                const colors = colorClasses[event.color];
                const planType = event.planType ? planTypeMap.get(event.planType) : null;
                return (
                  <div
                    key={event.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className={clsx('mt-1 w-2.5 h-2.5 rounded-full', colors.bg)} />
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {event.title}
                          </h3>
                          {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {event.priority && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {event.priority}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>
                          {event.isAllDay
                            ? 'All day'
                            : `${format(event.startDate, 'h:mm a')} - ${format(event.endDate, 'h:mm a')}`}
                        </span>
                      </div>
                      {event.planType && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-4 h-4" />
                          <span>{planType?.label || event.planType}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{format(event.startDate, 'MMM d')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
            <div className="space-y-3">
              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
                >
                  <div className="flex items-start gap-3">
                    {getTaskStatusIcon(task.status)}
                    <div className="flex-1">
                      <h3 className={clsx(
                        'text-sm font-semibold',
                        task.status === 'done'
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900 dark:text-white'
                      )}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {task.linkedPlanType && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {planTypeMap.get(task.linkedPlanType)?.label || task.linkedPlanType}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(dayStart, 'MMM d')}
                        </span>
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
    </div>
  );
}
