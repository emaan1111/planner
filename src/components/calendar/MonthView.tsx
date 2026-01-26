'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isToday, isWeekend, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, isSameDay, startOfDay, addDays } from 'date-fns';
import { useUIStore } from '@/store/uiStore';
import { useEvents, useUpdateEvent, useDeleteEvent, useCreateEvent } from '@/hooks/useEventsQuery';
import { PlanEvent, colorClasses } from '@/types';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { EventContextMenu } from './EventContextMenu';
import { EventTooltip } from '@/components/ui/EventTooltip';
import { DaySummaryTooltip } from '@/components/ui/DaySummaryTooltip';
import { DroppableCalendarCell } from '@/components/dnd';
import { useRouter } from 'next/navigation';
import { expandRecurringEvents } from '@/utils/recurrence';
import { toast } from '@/components/ui/Toast';

interface ResizeState {
  eventId: string;
  edge: 'start' | 'end';
  initialDate: Date;
  currentDate: Date;
}

interface DragState {
  eventId: string;
  initialDate: Date;
  currentDate: Date;
}

interface TooltipState {
  event: PlanEvent;
  position: { x: number; y: number };
}

interface DragSelectionState {
  startDate: Date;
  endDate: Date;
}

export function MonthView() {
  const { currentDate, openEventModal, selectedPlanTypes, cutEvent, copyEvent, clipboardEvent, setCurrentDate, clearClipboard } = useUIStore();
  const router = useRouter();
  const { data: events = [] } = useEvents();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  const createEventMutation = useCreateEvent();
  
  // Wrapper functions for mutations
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
  
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [contextMenu, setContextMenu] = useState<{ event: PlanEvent; position: { x: number; y: number } } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [daySummary, setDaySummary] = useState<{ date: Date; events: PlanEvent[]; position: { x: number; y: number } } | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelectionState | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragSelectionRef = useRef<DragSelectionState | null>(null);
  
  // Refs to track current state for event handlers (avoids stale closures)
  const resizingRef = useRef<ResizeState | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  const isDragging = useRef(false);
  
  // Keep refs in sync with state
  useEffect(() => { resizingRef.current = resizing; }, [resizing]);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);
  useEffect(() => { dragSelectionRef.current = dragSelection; }, [dragSelection]);

  const days = useMemo(() => {
    const start = startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const expandedEvents = useMemo(() => {
    if (events.length === 0 || days.length === 0) return [];
    return expandRecurringEvents(events, days[0], days[days.length - 1]);
  }, [events, days]);

  // Get all filtered events
  const filteredEvents = useMemo(() => {
    // Show all events if no filters selected, or filter by selected types
    // Always show events with no plan type
    if (selectedPlanTypes.length === 0) return expandedEvents;
    return expandedEvents.filter(e => !e.planType || selectedPlanTypes.includes(e.planType));
  }, [expandedEvents, selectedPlanTypes]);

  // Calculate which events span multiple days and their positions
  const getEventSpan = useCallback((event: PlanEvent, weekStart: Date, weekEnd: Date) => {
    const eventStart = startOfDay(new Date(event.startDate));
    const eventEnd = startOfDay(new Date(event.endDate));
    
    const displayStart = eventStart < weekStart ? weekStart : eventStart;
    const displayEnd = eventEnd > weekEnd ? weekEnd : eventEnd;
    
    const startCol = differenceInDays(displayStart, weekStart);
    const span = differenceInDays(displayEnd, displayStart) + 1;
    
    const startsBeforeWeek = eventStart < weekStart;
    const endsAfterWeek = eventEnd > weekEnd;
    
    return { startCol, span, startsBeforeWeek, endsAfterWeek, displayStart, displayEnd };
  }, []);

  // Group days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  // Get events for a week
  const getWeekEvents = useCallback((weekStart: Date, weekEnd: Date) => {
    return filteredEvents.filter(event => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = startOfDay(new Date(event.endDate));
      return (eventStart <= weekEnd && eventEnd >= weekStart);
    });
  }, [filteredEvents]);

  // Handle mouse move during resize/drag/select
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    // Only process if actively dragging (using ref to avoid stale closure)
    if (!isDragging.current) return;
    
    // Find which cell the mouse is over
    let foundDate: Date | null = null;
    cellRefs.current.forEach((cell, dateStr) => {
      const rect = cell.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && 
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        foundDate = new Date(dateStr);
      }
    });
    
    if (foundDate) {
      setHoveredDate(foundDate);
      setResizing(prev => prev ? { ...prev, currentDate: foundDate! } : null);
      setDragging(prev => prev ? { ...prev, currentDate: foundDate! } : null);
      
      // Update drag selection
      if (dragSelectionRef.current) {
        setDragSelection(prev => prev ? { ...prev, endDate: foundDate! } : null);
      }
    }
  }, []);

  // Handle mouse up to complete resize/drag/select
  const handleMouseUp = useCallback(() => {
    // Use refs to get current state values (avoids stale closures)
    const currentResizing = resizingRef.current;
    const currentDragging = draggingRef.current;
    const currentDragSelection = dragSelectionRef.current;
    
    if (currentDragSelection && isDragging.current) {
      if (!currentResizing && !currentDragging) {
        // Find start and end date
        let start = currentDragSelection.startDate;
        let end = currentDragSelection.endDate;
        if (start > end) {
          [start, end] = [end, start];
        }

        if (isSameDay(start, end)) {
          // Single day click handled here now instead of onClick
          setCurrentDate(start);
          if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
          }
           // We need to wait to see if it's a double click (handled elsewhere or here?)
           // Logic from CustomMonthView:
          clickTimeout.current = setTimeout(() => {
            openEventModal();
          }, 220);
        } else {
          // Range selection
          setCurrentDate(start);
          openEventModal(undefined, { startDate: start, endDate: end });
        }
      }
      setDragSelection(null);
    }
    
    if (currentResizing) {
      const event = expandedEvents.find(e => e.id === currentResizing.eventId);
      if (event) {
        if (event.recurrence || event.id.includes('_')) {
          // If it's a generated instance or the parent recurrence, warn restriction
          // Actually, if it's the parent (id has no _), we COULD allow allowing editing the series.
          // But since expandedEvents replaces the parent with instances in the view if logic dictates... 
          // Wait, my expansion logic KEEPS the parent if it's in the view range?
          // My expansion logic: "Result.push(...instances)". It does NOT include the original parent unless it falls in the range and we pushed it?
          // Actually logic says: "First add all non-recurring... Then expand recurring...".
          // So the PARENT (which has .recurrence) is NOT added to result in the first pass.
          // So only instances exist in expandedEvents for recurring events.
          // So they will ALL have '_' in ID.
          
          if (event.id.includes('_')) {
             toast.error("Editing repeating recurring events is not yet supported.");
             setResizing(null);
             return;
          }
        }

        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        if (currentResizing.edge === 'start') {
          const newStart = startOfDay(currentResizing.currentDate);
          if (newStart <= eventEnd) {
            resizeEvent(event.id, newStart, eventEnd);
          }
        } else {
          const newEnd = startOfDay(currentResizing.currentDate);
          if (newEnd >= eventStart) {
            resizeEvent(event.id, eventStart, newEnd);
          }
        }
      }
      setResizing(null);
    }
    
    if (currentDragging) {
      const event = expandedEvents.find(e => e.id === currentDragging.eventId);
      if (event) {
        if (event.id.includes('_')) {
             toast.error("Moving repeating recurring events is not yet supported.");
             setDragging(null);
             return;
        }

        const daysDiff = differenceInDays(currentDragging.currentDate, currentDragging.initialDate);
        const newStart = addDays(new Date(event.startDate), daysDiff);
        const newEnd = addDays(new Date(event.endDate), daysDiff);
        moveEvent(event.id, newStart, newEnd);
      }
      setDragging(null);
    }
    
    isDragging.current = false;
    setHoveredDate(null);
  }, [expandedEvents, resizeEvent, moveEvent]);

  // Add/remove global event listeners (always attached for immediate response)
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleResizeStart = (e: React.MouseEvent, eventId: string, edge: 'start' | 'end', date: Date) => {
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    setResizing({ eventId, edge, initialDate: date, currentDate: date });
  };

  const handleDragStart = (e: React.MouseEvent, eventId: string, date: Date) => {
    e.stopPropagation();
    isDragging.current = true;
    setDragging({ eventId, initialDate: date, currentDate: date });
  };

  const handleDayMouseDown = (date: Date, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (resizing || dragging) return;

    // Prevent default to stop text selection, but be careful with other interactions
    // e.preventDefault(); 
    
    isDragging.current = true;
    setDragSelection({ startDate: date, endDate: date });
  };

  // Single click to select date, double click to create event
  const handleDayClick = (date: Date) => {
    if (!resizing && !dragging) {
      setCurrentDate(date);
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
      clickTimeout.current = setTimeout(() => {
        openEventModal();
      }, 220);
    }
  };

  const handleDayDoubleClick = (date: Date) => {
    if (!resizing && !dragging) {
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
      setCurrentDate(date);
      router.push(`/day/${format(date, 'yyyy-MM-dd')}`);
    }
  };

  const handleEventClick = (e: React.MouseEvent, event: PlanEvent) => {
    e.stopPropagation();
    if (!resizing && !dragging) {
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
  };

  const handleEventMouseEnter = (e: React.MouseEvent, event: PlanEvent) => {
    // Clear any existing timeout
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    // Show tooltip after a short delay
    tooltipTimeout.current = setTimeout(() => {
      setTooltip({
        event,
        position: { x: e.clientX, y: e.clientY },
      });
    }, 500);
  };

  const handleEventMouseLeave = () => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }
    setTooltip(null);
  };

  const handleEventContextMenu = (e: React.MouseEvent, event: PlanEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTooltip(null);
    setContextMenu({
      event,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleDayContextMenu = (e: React.MouseEvent, date: Date) => {
    if (clipboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      pasteEvent(startOfDay(date));
    }
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Check if a date is selected
  const isSelected = useCallback((date: Date) => {
    if (!dragSelection) return false;
    // Handle both forward and backward usage
    const start = dragSelection.startDate < dragSelection.endDate ? dragSelection.startDate : dragSelection.endDate;
    const end = dragSelection.startDate < dragSelection.endDate ? dragSelection.endDate : dragSelection.startDate;
    return (date >= start && date <= end) || isSameDay(date, start) || isSameDay(date, end);
  }, [dragSelection]);

  // Calculate preview for resize/drag
  const getPreviewSpan = useCallback((event: PlanEvent) => {
    if (resizing && resizing.eventId === event.id) {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      if (resizing.edge === 'start') {
        return { start: resizing.currentDate, end: eventEnd };
      } else {
        return { start: eventStart, end: resizing.currentDate };
      }
    }
    
    if (dragging && dragging.eventId === event.id) {
      const daysDiff = differenceInDays(dragging.currentDate, dragging.initialDate);
      return {
        start: addDays(new Date(event.startDate), daysDiff),
        end: addDays(new Date(event.endDate), daysDiff)
      };
    }
    
    return null;
  }, [resizing, dragging]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={clsx(
        "bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800",
        (resizing || dragging) && "select-none"
      )}
    >
      {/* Week day headers */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      {weeks.map((week, weekIndex) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        const weekEvents = getWeekEvents(weekStart, weekEnd);
        
        // Sort events by start date and duration for consistent stacking
        const sortedEvents = [...weekEvents].sort((a, b) => {
          const startDiff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          if (startDiff !== 0) return startDiff;
          const aDuration = differenceInDays(new Date(a.endDate), new Date(a.startDate));
          const bDuration = differenceInDays(new Date(b.endDate), new Date(b.startDate));
          return bDuration - aDuration; // Longer events first
        });

        // Calculate layout positions to pack events upwards
        const eventRows = new Map<string, number>();
        const occupied = new Set<string>(); // "row-col"

        sortedEvents.forEach(event => {
          const preview = getPreviewSpan(event);
          const effectiveStart = preview ? preview.start : new Date(event.startDate);
          const effectiveEnd = preview ? preview.end : new Date(event.endDate);
          
          const { startCol, span } = getEventSpan(
            { ...event, startDate: effectiveStart, endDate: effectiveEnd },
            weekStart,
            weekEnd
          );

          if (span <= 0 || startCol < 0 || startCol > 6) return;

          let rowIndex = 0;
          let valid = false;

          while (!valid) {
            valid = true;
            for (let i = 0; i < span; i++) {
              if (occupied.has(`${rowIndex}-${startCol + i}`)) {
                valid = false;
                break;
              }
            }
            if (!valid) rowIndex++;
          }

          eventRows.set(event.id, rowIndex);
          for (let i = 0; i < span; i++) {
            occupied.add(`${rowIndex}-${startCol + i}`);
          }
        });

        const MAX_ROWS = 3;
        const hiddenEventsPerDay = new Map<string, number>();

        sortedEvents.forEach(event => {
          const row = eventRows.get(event.id) ?? 0;
          if (row >= MAX_ROWS) {
            week.forEach(day => {
              const start = startOfDay(new Date(event.startDate));
              const end = startOfDay(new Date(event.endDate));
              if (day >= start && day <= end) {
                 const key = day.toISOString();
                 hiddenEventsPerDay.set(key, (hiddenEventsPerDay.get(key) || 0) + 1);
              }
            });
          }
        });

        return (
          <div key={weekIndex} className="relative">
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {week.map((date) => {
                const dayIsToday = isToday(date);
                const dayIsWeekend = isWeekend(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isHovered = hoveredDate && isSameDay(date, hoveredDate);
                const hiddenCount = hiddenEventsPerDay.get(date.toISOString()) || 0;

                return (
                  <DroppableCalendarCell
                    key={date.toISOString()}
                    date={date}
                    onMouseDown={(e) => handleDayMouseDown(date, e)}
                    onMouseEnter={(e) => {
                      if (isDragging.current && dragSelection) {
                         return;
                      }
                      
                      const eventsForDay = expandedEvents.filter(event => {
                         const start = startOfDay(new Date(event.startDate));
                         const end = startOfDay(new Date(event.endDate));
                         return date >= start && date <= end;
                      });
                      
                      if (eventsForDay.length > 0) {
                         setDaySummary({
                             date,
                             events: eventsForDay.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
                             position: { x: e.clientX + 20, y: e.clientY + 20 }
                         });
                      }
                    }}
                    onMouseLeave={() => setDaySummary(null)}
                    onDoubleClick={() => handleDayDoubleClick(date)}
                    onContextMenu={(e) => handleDayContextMenu(e, date)}
                    className={clsx(
                      'min-h-[120px] p-2 border-b border-r border-gray-100 dark:border-gray-800 transition-colors cursor-pointer select-none relative',
                      !isCurrentMonth && 'bg-gray-50 dark:bg-gray-900/50',
                      dayIsWeekend && isCurrentMonth && 'bg-gray-50/50 dark:bg-gray-900/30',
                      'hover:bg-gray-100 dark:hover:bg-gray-800/50',
                      isHovered && (resizing || dragging) && 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 ring-inset',
                      clipboardEvent && 'hover:ring-2 hover:ring-green-400 hover:ring-inset',
                      isSelected(date) && 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 ring-inset'
                    )}
                    cellRef={(el) => {
                      if (el) cellRefs.current.set(date.toISOString(), el);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={clsx(
                          'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                          dayIsToday && 'bg-blue-500 text-white',
                          !dayIsToday && !isCurrentMonth && 'text-gray-400 dark:text-gray-600',
                          !dayIsToday && isCurrentMonth && 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {format(date, 'd')}
                      </span>
                    </div>
                    
                    {/* Spacer for multi-day events */}
                    <div className="h-[calc(100%-32px)]">
                      {hiddenCount > 0 && (
                        <div className="absolute bottom-2 left-2 right-2">
                           <span className="inline-block px-1.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 rounded">
                             +{hiddenCount} more
                           </span>
                        </div>
                      )}
                    </div>
                  </DroppableCalendarCell>
                );
              })}
            </div>

            {/* Multi-day events overlay */}
            <div className="absolute top-10 left-0 right-0 pointer-events-none">
              <AnimatePresence>
                {sortedEvents.map((event, eventIndex) => {
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
                  const isBeingModified = (resizing?.eventId === event.id) || (dragging?.eventId === event.id);
                  const isMultiDay = differenceInDays(effectiveEnd, effectiveStart) > 0;

                  const row = eventRows.get(event.id) ?? 0;
                  
                  if (row >= 3) return null;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        left: `${(startCol / 7) * 100}%`,
                        width: `${(Math.min(span, 7 - startCol) / 7) * 100}%`,
                        top: `${row * 28}px`,
                      }}
                      className={clsx(
                        'absolute h-6 pointer-events-auto group',
                        isBeingModified && 'z-50'
                      )}
                    >
                      <div
                        onMouseDown={(e) => handleDragStart(e, event.id, effectiveStart)}
                        onClick={(e) => handleEventClick(e, event)}
                        onContextMenu={(e) => handleEventContextMenu(e, event)}
                        onMouseEnter={(e) => handleEventMouseEnter(e, event)}
                        onMouseLeave={handleEventMouseLeave}
                        className={clsx(
                          'h-full mx-0.5 rounded-md flex items-center text-white text-xs font-medium cursor-grab active:cursor-grabbing transition-all relative overflow-hidden',
                          colors.bg,
                          'hover:shadow-lg hover:scale-[1.02]',
                          isBeingModified && 'shadow-xl scale-[1.02] ring-2 ring-white/50',
                          (event.status === 'done' || event.status === 'no-action') && 'opacity-60',
                          event.status === 'no-action' && 'line-through decoration-white/50',
                          !startsBeforeWeek && 'rounded-l-md pl-2',
                          !endsAfterWeek && 'rounded-r-md pr-2',
                          startsBeforeWeek && 'rounded-l-none pl-1',
                          endsAfterWeek && 'rounded-r-none pr-1'
                        )}
                      >
                        {/* Left resize handle */}
                        {!startsBeforeWeek && (
                          <div
                            onMouseDown={(e) => handleResizeStart(e, event.id, 'start', effectiveStart)}
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-gradient-to-r from-white/30 to-transparent hover:from-white/50 transition-opacity"
                            title="Drag to resize start"
                          />
                        )}
                        
                        <span className="truncate flex-1 px-1">
                          {!startsBeforeWeek && event.title}
                          {startsBeforeWeek && !endsAfterWeek && event.title}
                        </span>
                        
                        {/* Duration indicator */}
                        {isMultiDay && !endsAfterWeek && (
                          <span className="text-[10px] opacity-75 mr-1">
                            {differenceInDays(effectiveEnd, effectiveStart) + 1}d
                          </span>
                        )}
                        
                        {/* Right resize handle */}
                        {!endsAfterWeek && (
                          <div
                            onMouseDown={(e) => handleResizeStart(e, event.id, 'end', effectiveEnd)}
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-gradient-to-l from-white/30 to-transparent hover:from-white/50 transition-opacity"
                            title="Drag to resize end"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {/* Resize/Drag indicator */}
      <AnimatePresence>
        {(resizing || dragging) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full shadow-xl z-50 text-sm font-medium"
          >
            {resizing ? (
              <>Resizing: {format(resizing.currentDate, 'MMM d, yyyy')}</>
            ) : dragging ? (
              <>Moving to: {format(dragging.currentDate, 'MMM d, yyyy')}</>
            ) : null}
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
            <span>Right-click on a day to paste &quot;{clipboardEvent.title}&quot;</span>
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

      {/* Day Summary Tooltip */}
      <DaySummaryTooltip
        date={daySummary?.date || null}
        events={daySummary?.events || []}
        position={daySummary?.position || null}
      />
    </motion.div>
  );
}
