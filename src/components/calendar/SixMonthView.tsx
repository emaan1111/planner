'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays, addDays, startOfDay, isWithinInterval, min, max } from 'date-fns';
import { useUIStore } from '@/store/uiStore';
import { useEvents, useUpdateEvent, useDeleteEvent, useCreateEvent } from '@/hooks/useEventsQuery';
import { PlanEvent, colorClasses } from '@/types';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { EventContextMenu } from './EventContextMenu';
import { EventTooltip } from '@/components/ui/EventTooltip';
import { useRouter } from 'next/navigation';
import { expandRecurringEvents } from '@/utils/recurrence';
import { toast } from '@/components/ui/Toast';

// Layout constants
const MAX_EVENTS_PER_WEEK = 2;
const EVENT_HEIGHT = 12; // px
const EVENT_GAP = 2; // px
const HEADER_HEIGHT = 18; // px for date number

interface DragSelectionState {
  startDate: Date;
  endDate: Date;
}

interface EventDragState {
  eventId: string;
  initialDate: Date;
  currentDate: Date;
}

interface ResizeState {
  eventId: string;
  edge: 'start' | 'end';
  initialDate: Date;
  currentDate: Date;
}

interface TooltipState {
  event: PlanEvent;
  position: { x: number; y: number };
}

interface CompactMonthProps {
  monthDate: Date;
  dragSelection: DragSelectionState | null;
  eventDrag: EventDragState | null;
  resize: ResizeState | null;
  onDayMouseDown: (date: Date, e: React.MouseEvent) => void;
  onDayMouseEnter: (date: Date) => void;
  onDayDoubleClick: (date: Date) => void;
  onDayContextMenu: (date: Date, e: React.MouseEvent) => void;
  onEventClick: (event: PlanEvent, e: React.MouseEvent) => void;
  onEventMouseDown: (event: PlanEvent, date: Date, e: React.MouseEvent) => void;
  onEventContextMenu: (event: PlanEvent, e: React.MouseEvent) => void;
  onEventMouseEnter: (event: PlanEvent, e: React.MouseEvent) => void;
  onEventMouseLeave: () => void;
  onResizeStart: (event: PlanEvent, edge: 'start' | 'end', date: Date, e: React.MouseEvent) => void;
  cellRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  events: PlanEvent[];
}

function CompactMonth({ 
  monthDate, 
  events,
  dragSelection, 
  eventDrag,
  resize,
  onDayMouseDown, 
  onDayMouseEnter, 
  onDayDoubleClick,
  onDayContextMenu,
  onEventClick,
  onEventMouseDown,
  onEventContextMenu,
  onEventMouseEnter,
  onEventMouseLeave,
  onResizeStart,
  cellRefs 
}: CompactMonthProps) {
  const { selectedPlanTypes } = useUIStore();
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  // Get filtered events for this month (including overflow days)
  const monthEvents = useMemo(() => {
    // Use the full visible range (including overflow days from adjacent months)
    const visibleStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const visibleEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return events.filter(event => {
      // Show events with no plan type, or if selected in filter
      if (selectedPlanTypes.length > 0 && event.planType && !selectedPlanTypes.includes(event.planType)) return false;
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = startOfDay(new Date(event.endDate));
      return eventStart <= visibleEnd && eventEnd >= visibleStart;
    });
  }, [events, monthDate, selectedPlanTypes]);

  // Get events for a specific week
  const getWeekEvents = useCallback((weekStart: Date, weekEnd: Date) => {
    return monthEvents.filter(event => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = startOfDay(new Date(event.endDate));
      return eventStart <= weekEnd && eventEnd >= weekStart;
    }).sort((a, b) => {
      const startDiff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (startDiff !== 0) return startDiff;
      const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
      const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
      return bDuration - aDuration;
    });
  }, [monthEvents]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    return monthEvents.filter(event => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = startOfDay(new Date(event.endDate));
      return date >= eventStart && date <= eventEnd;
    });
  }, [monthEvents]);

  // Calculate event span within a week
  const getEventSpan = useCallback((event: PlanEvent, weekStart: Date, weekEnd: Date) => {
    const eventStart = startOfDay(new Date(event.startDate));
    const eventEnd = startOfDay(new Date(event.endDate));
    
    const displayStart = eventStart < weekStart ? weekStart : eventStart;
    const displayEnd = eventEnd > weekEnd ? weekEnd : eventEnd;
    
    const startCol = differenceInDays(displayStart, weekStart);
    const span = differenceInDays(displayEnd, displayStart) + 1;
    
    const startsBeforeWeek = eventStart < weekStart;
    const endsAfterWeek = eventEnd > weekEnd;
    
    return { startCol, span, startsBeforeWeek, endsAfterWeek };
  }, []);

  // Check if a date is in the drag selection range
  const isInSelection = useCallback((date: Date) => {
    if (!dragSelection) return false;
    const start = min([dragSelection.startDate, dragSelection.endDate]);
    const end = max([dragSelection.startDate, dragSelection.endDate]);
    return isWithinInterval(date, { start, end });
  }, [dragSelection]);

  // Get preview for event being dragged or resized
  const getPreviewSpan = useCallback((event: PlanEvent) => {
    if (resize && resize.eventId === event.id) {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      if (resize.edge === 'start') {
        return { start: resize.currentDate, end: eventEnd };
      } else {
        return { start: eventStart, end: resize.currentDate };
      }
    }
    if (eventDrag && eventDrag.eventId === event.id) {
      const daysDiff = differenceInDays(eventDrag.currentDate, eventDrag.initialDate);
      return {
        start: addDays(new Date(event.startDate), daysDiff),
        end: addDays(new Date(event.endDate), daysDiff)
      };
    }
    return null;
  }, [resize, eventDrag]);

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 py-2 text-center bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        {format(monthDate, 'MMMM yyyy')}
      </h3>
      
      {/* Week day headers */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-700">
        {weekDays.map((day, idx) => (
          <div key={idx} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Weeks with events */}
      {weeks.map((week, weekIndex) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        const weekEvents = getWeekEvents(weekStart, weekEnd);
        const visibleEventCount = Math.min(weekEvents.length, MAX_EVENTS_PER_WEEK);
        const weekRowHeight = Math.max(40, HEADER_HEIGHT + (visibleEventCount * (EVENT_HEIGHT + EVENT_GAP)) + 4);

        return (
          <div key={weekIndex} className="relative">
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {week.map((date) => {
                const dayEvents = getEventsForDate(date);
                const dayIsToday = isToday(date);
                const inMonth = isSameMonth(date, monthDate);
                const hasEvents = dayEvents.length > 0;
                const isSelected = isInSelection(date);
                const isEventHovering = eventDrag || resize;

                return (
                  <div
                    key={date.toISOString()}
                    ref={(el) => {
                      if (el) cellRefs.current.set(date.toISOString(), el);
                    }}
                    onMouseDown={(e) => onDayMouseDown(date, e)}
                    onMouseEnter={() => onDayMouseEnter(date)}
                    onDoubleClick={() => onDayDoubleClick(date)}
                    onContextMenu={(e) => onDayContextMenu(date, e)}
                    style={{ minHeight: `${weekRowHeight}px` }}
                    className={clsx(
                      'p-0.5 border-b border-r border-gray-100 dark:border-gray-800 transition-all cursor-pointer select-none relative overflow-hidden',
                      !inMonth && 'bg-gray-50 dark:bg-gray-900/50',
                      inMonth && 'hover:bg-gray-100 dark:hover:bg-gray-800/50',
                      isSelected && 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 ring-inset',
                      isEventHovering && 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
                      dayIsToday && 'bg-red-50 dark:bg-red-900/10'
                    )}
                  >
                    {/* Today indicator */}
                    {dayIsToday && (
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.8, 1]
                        }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm shadow-red-500/50"
                      />
                    )}
                    
                    <div className="flex items-center justify-center">
                      <span
                        className={clsx(
                          'text-[10px] font-medium w-4 h-4 flex items-center justify-center rounded-full',
                          dayIsToday && 'bg-red-500 text-white',
                          !dayIsToday && !inMonth && 'text-gray-400 dark:text-gray-600',
                          !dayIsToday && inMonth && 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {format(date, 'd')}
                      </span>
                    </div>
                    
                    {/* Event dots for days without week events overlay */}
                    {hasEvents && weekEvents.length === 0 && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 2).map((event, idx) => (
                          <div
                            key={idx}
                            className={clsx('w-1 h-1 rounded-full', colorClasses[event.color].bg)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Multi-day events overlay */}
            <div className="absolute left-0 right-0 pointer-events-none px-0.5" style={{ top: `${HEADER_HEIGHT}px` }}>
              <AnimatePresence>
                {weekEvents.slice(0, MAX_EVENTS_PER_WEEK).map((event, eventIndex) => {
                  const preview = getPreviewSpan(event);
                  const effectiveStart = preview ? preview.start : new Date(event.startDate);
                  const effectiveEnd = preview ? preview.end : new Date(event.endDate);
                  
                  const { startCol, span, startsBeforeWeek, endsAfterWeek } = getEventSpan(
                    { ...event, startDate: effectiveStart, endDate: effectiveEnd },
                    weekStart,
                    weekEnd
                  );
                  
                  if (span <= 0 || startCol < 0 || startCol > 6) return null;
                  
                  const colors = colorClasses[event.color];
                  const isBeingModified = (resize?.eventId === event.id) || (eventDrag?.eventId === event.id);

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        left: `${(startCol / 7) * 100}%`,
                        width: `${(Math.min(span, 7 - startCol) / 7) * 100}%`,
                        top: `${eventIndex * (EVENT_HEIGHT + EVENT_GAP)}px`,
                        height: `${EVENT_HEIGHT}px`,
                      }}
                      className={clsx(
                        'absolute pointer-events-auto group',
                        isBeingModified && 'z-50'
                      )}
                    >
                      <div
                        onMouseDown={(e) => onEventMouseDown(event, effectiveStart, e)}
                        onClick={(e) => onEventClick(event, e)}
                        onContextMenu={(e) => onEventContextMenu(event, e)}
                        onMouseEnter={(e) => onEventMouseEnter(event, e)}
                        onMouseLeave={onEventMouseLeave}
                        className={clsx(
                          'h-full mx-0.5 rounded flex items-center text-white text-[8px] font-medium cursor-grab active:cursor-grabbing transition-all relative overflow-hidden',
                          colors.bg,
                          'hover:shadow-md hover:scale-[1.02]',
                          isBeingModified && 'shadow-lg scale-[1.02] ring-2 ring-white/50',
                          !startsBeforeWeek && 'rounded-l pl-0.5',
                          !endsAfterWeek && 'rounded-r pr-0.5',
                          startsBeforeWeek && 'rounded-l-none',
                          endsAfterWeek && 'rounded-r-none'
                        )}
                      >
                        {/* Left resize handle */}
                        {!startsBeforeWeek && (
                          <div
                            onMouseDown={(e) => onResizeStart(event, 'start', effectiveStart, e)}
                            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-gradient-to-r from-white/40 to-transparent transition-opacity"
                          />
                        )}
                        
                        <span className="truncate flex-1 px-0.5">
                          {!startsBeforeWeek && event.title}
                        </span>
                        
                        {/* Right resize handle */}
                        {!endsAfterWeek && (
                          <div
                            onMouseDown={(e) => onResizeStart(event, 'end', effectiveEnd, e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-gradient-to-l from-white/40 to-transparent transition-opacity"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {/* Show +N more indicator if there are hidden events */}
              {weekEvents.length > MAX_EVENTS_PER_WEEK && (
                <div 
                  className="text-[8px] text-gray-500 dark:text-gray-400 font-medium pl-1 pointer-events-auto cursor-pointer hover:text-blue-500"
                  style={{ marginTop: `${MAX_EVENTS_PER_WEEK * (EVENT_HEIGHT + EVENT_GAP)}px` }}
                >
                  +{weekEvents.length - MAX_EVENTS_PER_WEEK} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

export function SixMonthView() {
  const { 
    currentDate, 
    openEventModal, 
    setCurrentDate,
    cutEvent, 
    copyEvent, 
    clipboardEvent, 
    clearClipboard 
  } = useUIStore();
  const router = useRouter();

  const { data: events = [] } = useEvents();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  const createEventMutation = useCreateEvent();
  
  const moveEvent = useCallback((id: string, startDate: Date, endDate: Date) => {
    updateEventMutation.mutate({ id, updates: { startDate, endDate } });
  }, [updateEventMutation]);
  
  const resizeEvent = useCallback((id: string, startDate: Date, endDate: Date) => {
    updateEventMutation.mutate({ id, updates: { startDate, endDate } });
  }, [updateEventMutation]);
  
  const deleteEvent = useCallback((id: string) => {
    deleteEventMutation.mutate(id);
  }, [deleteEventMutation]);
  
  const duplicateEvent = useCallback((event: PlanEvent) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...eventData } = event;
    createEventMutation.mutate(eventData);
  }, [createEventMutation]);
  
  const pasteEvent = useCallback((targetDate: Date) => {
    if (!clipboardEvent) return;
    const duration = differenceInDays(new Date(clipboardEvent.endDate), new Date(clipboardEvent.startDate));
    const newEndDate = addDays(targetDate, duration);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...eventData } = clipboardEvent;
    createEventMutation.mutate({ ...eventData, startDate: targetDate, endDate: newEndDate });
    clearClipboard();
  }, [clipboardEvent, createEventMutation, clearClipboard]);

  const [dragSelection, setDragSelection] = useState<DragSelectionState | null>(null);
  const [eventDrag, setEventDrag] = useState<EventDragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ event: PlanEvent; position: { x: number; y: number } } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isDragging = useRef(false);
  
  // Refs to track current state for event handlers (avoids stale closures)
  const dragSelectionRef = useRef<DragSelectionState | null>(null);
  const eventDragRef = useRef<EventDragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => { dragSelectionRef.current = dragSelection; }, [dragSelection]);
  useEffect(() => { eventDragRef.current = eventDrag; }, [eventDrag]);
  useEffect(() => { resizeRef.current = resize; }, [resize]);

  const months = useMemo(() => {
    // Show current month and next 5 months (6 months total)
    const today = new Date();
    return [0, 1, 2, 3, 4, 5].map(offset => addMonths(startOfMonth(today), offset));
  }, []);

  // Calculate expanded events for 6-month view
  const expandedEvents = useMemo(() => {
    if (events.length === 0 || months.length === 0) return [];
    
    const rangeStart = startOfWeek(startOfMonth(months[0]), { weekStartsOn: 1 });
    const rangeEnd = endOfWeek(endOfMonth(months[months.length - 1]), { weekStartsOn: 1 });
    
    return expandRecurringEvents(events, rangeStart, rangeEnd);
  }, [events, months]);

  // Handle mouse move for drag selection and event operations
  const handleMouseMove = useCallback((e: MouseEvent) => {
    let foundDate: Date | null = null;
    cellRefs.current.forEach((cell, dateStr) => {
      const rect = cell.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && 
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        foundDate = new Date(dateStr);
      }
    });

    if (foundDate) {
      // Use functional updates to avoid stale closure issues
      if (isDragging.current) {
        setDragSelection(prev => prev ? { ...prev, endDate: foundDate! } : null);
      }
      setEventDrag(prev => prev ? { ...prev, currentDate: foundDate! } : null);
      setResize(prev => prev ? { ...prev, currentDate: foundDate! } : null);
    }
  }, []);

  // Handle mouse up to complete operations
  const handleMouseUp = useCallback(() => {
    const currentDragSelection = dragSelectionRef.current;
    const currentEventDrag = eventDragRef.current;
    const currentResize = resizeRef.current;
    
    if (currentDragSelection && isDragging.current) {
      const start = min([currentDragSelection.startDate, currentDragSelection.endDate]);
      const end = max([currentDragSelection.startDate, currentDragSelection.endDate]);
      
      if (isSameDay(start, end)) {
        setCurrentDate(start);
        if (clickTimeout.current) {
          clearTimeout(clickTimeout.current);
        }
        clickTimeout.current = setTimeout(() => {
          openEventModal();
        }, 220);
      } else {
        setCurrentDate(start);
        openEventModal(undefined, { startDate: start, endDate: end });
      }
      setDragSelection(null);
    }

    if (currentEventDrag) {
      const event = expandedEvents.find(e => e.id === currentEventDrag.eventId);
      if (event) {
        if (event.id.includes('_')) {
           toast.info("Moving recurring event instances is not yet supported.");
           setEventDrag(null);
           isDragging.current = false;
           return;
        }

        const daysDiff = differenceInDays(currentEventDrag.currentDate, currentEventDrag.initialDate);
        if (daysDiff !== 0) {
          const newStart = addDays(new Date(event.startDate), daysDiff);
          const newEnd = addDays(new Date(event.endDate), daysDiff);
          moveEvent(event.id, newStart, newEnd);
        }
      }
      setEventDrag(null);
    }

    if (currentResize) {
      const event = expandedEvents.find(e => e.id === currentResize.eventId);
      if (event) {
        if (event.id.includes('_')) {
           toast.info("Resizing recurring event instances is not yet supported.");
           setResize(null);
           isDragging.current = false;
           return;
        }

        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        if (currentResize.edge === 'start') {
          const newStart = startOfDay(currentResize.currentDate);
          if (newStart <= eventEnd) {
            resizeEvent(event.id, newStart, eventEnd);
          }
        } else {
          const newEnd = startOfDay(currentResize.currentDate);
          if (newEnd >= eventStart) {
            resizeEvent(event.id, eventStart, newEnd);
          }
        }
      }
      setResize(null);
    }

    isDragging.current = false;
  }, [expandedEvents, moveEvent, resizeEvent, openEventModal, setCurrentDate, router]);

  // Add global event listeners (always attached for immediate response)
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handlers for day interactions
  const handleDayMouseDown = useCallback((date: Date, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    setDragSelection({ startDate: date, endDate: date });
  }, []);

  const handleDayMouseEnter = useCallback((date: Date) => {
    // Only check ref to avoid stale closure issues
    if (isDragging.current) {
      setDragSelection(prev => prev ? { ...prev, endDate: date } : null);
    }
  }, []);

  const handleDayDoubleClick = useCallback((date: Date) => {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
    }
    setCurrentDate(date);
    router.push(`/day/${format(date, 'yyyy-MM-dd')}`);
  }, [setCurrentDate, router]);

  const handleDayContextMenu = useCallback((date: Date, e: React.MouseEvent) => {
    if (clipboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      pasteEvent(startOfDay(date));
    }
  }, [clipboardEvent, pasteEvent]);

  // Handlers for event interactions
  const handleEventClick = useCallback((event: PlanEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!eventDrag && !resize) {
      setTooltip(null);
      
      let targetEvent = event;
      if (typeof event.id === 'string' && event.id.includes('_')) {
        const originalId = event.id.split('_')[0];
        const parent = events.find(ev => ev.id === originalId);
        if (parent) {
          targetEvent = parent;
          toast.info("Editing recurrence series.");
        } else {
          toast.error("Original event not found.");
          return;
        }
      }
      openEventModal(targetEvent);
    }
  }, [eventDrag, resize, openEventModal, events]);

  const handleEventMouseDown = useCallback((event: PlanEvent, date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEventDrag({ eventId: event.id, initialDate: date, currentDate: date });
  }, []);

  const handleEventContextMenu = useCallback((event: PlanEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTooltip(null);
    setContextMenu({
      event,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const handleEventMouseEnter = useCallback((event: PlanEvent, e: React.MouseEvent) => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    tooltipTimeout.current = setTimeout(() => {
      setTooltip({
        event,
        position: { x: e.clientX, y: e.clientY },
      });
    }, 500);
  }, []);

  const handleEventMouseLeave = useCallback(() => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    setTooltip(null);
  }, []);

  const handleResizeStart = useCallback((event: PlanEvent, edge: 'start' | 'end', date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResize({ eventId: event.id, edge, initialDate: date, currentDate: date });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={clsx(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3",
        (dragSelection || eventDrag || resize) && "select-none"
      )}
    >
      <AnimatePresence mode="popLayout">
        {months.map((monthDate, index) => (
          <motion.div
            key={monthDate.toISOString()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            <CompactMonth 
              monthDate={monthDate} 
              events={expandedEvents}
              dragSelection={dragSelection}
              eventDrag={eventDrag}
              resize={resize}
              onDayMouseDown={handleDayMouseDown}
              onDayMouseEnter={handleDayMouseEnter}
              onDayDoubleClick={handleDayDoubleClick}
              onDayContextMenu={handleDayContextMenu}
              onEventClick={handleEventClick}
              onEventMouseDown={handleEventMouseDown}
              onEventContextMenu={handleEventContextMenu}
              onEventMouseEnter={handleEventMouseEnter}
              onEventMouseLeave={handleEventMouseLeave}
              onResizeStart={handleResizeStart}
              cellRefs={cellRefs}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Operation indicator */}
      <AnimatePresence>
        {(dragSelection || eventDrag || resize) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full shadow-xl z-50 text-sm font-medium"
          >
            {dragSelection && (
              <>
                Select: {format(min([dragSelection.startDate, dragSelection.endDate]), 'MMM d')} - {format(max([dragSelection.startDate, dragSelection.endDate]), 'MMM d')}
              </>
            )}
            {resize && (
              <>Resizing: {format(resize.currentDate, 'MMM d, yyyy')}</>
            )}
            {eventDrag && (
              <>Moving to: {format(eventDrag.currentDate, 'MMM d, yyyy')}</>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clipboard indicator */}
      <AnimatePresence>
        {clipboardEvent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-xl z-50 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Right-click to paste &quot;{clipboardEvent.title}&quot;</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Context Menu */}
      <EventContextMenu
        event={contextMenu?.event || null}
        position={contextMenu?.position || null}
        onClose={() => setContextMenu(null)}
        onDelete={deleteEvent}
        onCut={cutEvent}
        onCopy={copyEvent}
        onDuplicate={duplicateEvent}
      />

      {/* Event Tooltip */}
      <EventTooltip
        event={tooltip?.event || null}
        position={tooltip?.position || null}
      />
    </motion.div>
  );
}
