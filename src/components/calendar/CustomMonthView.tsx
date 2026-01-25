'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays, addDays, startOfDay, isWithinInterval, min, max, setMonth, setYear, getMonth, getYear } from 'date-fns';
import { useUIStore } from '@/store/uiStore';
import { useEvents, useUpdateEvent, useDeleteEvent, useCreateEvent } from '@/hooks/useEventsQuery';
import { PlanEvent, colorClasses, SavedCustomViewMonth } from '@/types';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { EventContextMenu } from './EventContextMenu';
import { EventTooltip } from '@/components/ui/EventTooltip';
import { Check, ChevronDown, X, Save, FolderOpen, Trash2, Maximize2, Minimize2 } from 'lucide-react';

// Layout constants
const MAX_EVENTS_PER_WEEK = 2;
const EVENT_HEIGHT = 12; // px
const EVENT_GAP = 2; // px
const HEADER_HEIGHT = 20; // px for date number
const MIN_SIZE = 180;
const MAX_SIZE = 800;
const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 280;

// Resize handle types
type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface CalendarSize {
  width: number;
  height: number;
}

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

interface SelectedMonth {
  year: number;
  month: number; // 0-11
  width: number;
  height: number;
}

interface CompactMonthProps {
  monthDate: Date;
  size: CalendarSize;
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
  onRemove: () => void;
  onSizeChange: (size: CalendarSize) => void;
  cellRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

// Resize handle component for edges and corners
function ResizeHandle({ 
  direction, 
  onResizeStart 
}: { 
  direction: ResizeDirection; 
  onResizeStart: (direction: ResizeDirection, e: React.MouseEvent) => void;
}) {
  const getCursor = () => {
    switch (direction) {
      case 'n': case 's': return 'cursor-ns-resize';
      case 'e': case 'w': return 'cursor-ew-resize';
      case 'ne': case 'sw': return 'cursor-nesw-resize';
      case 'nw': case 'se': return 'cursor-nwse-resize';
    }
  };

  const getPosition = () => {
    switch (direction) {
      case 'n': return 'top-0 left-2 right-2 h-1.5 -mt-0.5';
      case 's': return 'bottom-0 left-2 right-2 h-1.5 -mb-0.5';
      case 'e': return 'right-0 top-2 bottom-2 w-1.5 -mr-0.5';
      case 'w': return 'left-0 top-2 bottom-2 w-1.5 -ml-0.5';
      case 'ne': return 'top-0 right-0 w-3 h-3 -mt-0.5 -mr-0.5';
      case 'nw': return 'top-0 left-0 w-3 h-3 -mt-0.5 -ml-0.5';
      case 'se': return 'bottom-0 right-0 w-3 h-3 -mb-0.5 -mr-0.5';
      case 'sw': return 'bottom-0 left-0 w-3 h-3 -mb-0.5 -ml-0.5';
    }
  };

  return (
    <div
      className={clsx(
        'absolute z-20 opacity-0 hover:opacity-100 transition-opacity',
        getCursor(),
        getPosition(),
        (direction === 'ne' || direction === 'nw' || direction === 'se' || direction === 'sw') 
          ? 'hover:bg-blue-400/50 rounded' 
          : 'hover:bg-blue-400/30'
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(direction, e);
      }}
    />
  );
}

function CompactMonth({ 
  monthDate, 
  size,
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
  onRemove,
  onSizeChange,
  cellRefs 
}: CompactMonthProps) {
  const { selectedPlanTypes } = useUIStore();
  const { data: events = [] } = useEvents();
  const [isResizing, setIsResizing] = useState(false);
  
  // Helper function to get events for a date
  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) =>
        (selectedPlanTypes.length === 0 || selectedPlanTypes.includes(event.planType)) &&
        isWithinInterval(date, { start: event.startDate, end: event.endDate })
    );
  };
  
  // Handle resize from edges/corners
  const handleResizeStart = useCallback((direction: ResizeDirection, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      // Adjust width based on direction
      if (direction.includes('e')) {
        newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startWidth + deltaX));
      } else if (direction.includes('w')) {
        newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startWidth - deltaX));
      }
      
      // Adjust height based on direction
      if (direction.includes('s')) {
        newHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startHeight + deltaY));
      } else if (direction.includes('n')) {
        newHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startHeight - deltaY));
      }
      
      onSizeChange({ width: newWidth, height: newHeight });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [size, onSizeChange]);
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const monthEvents = useMemo(() => {
    // Use the full visible range (including overflow days from adjacent months)
    const visibleStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const visibleEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return events.filter(event => {
      if (selectedPlanTypes.length > 0 && !selectedPlanTypes.includes(event.planType)) return false;
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = startOfDay(new Date(event.endDate));
      return eventStart <= visibleEnd && eventEnd >= visibleStart;
    });
  }, [events, monthDate, selectedPlanTypes]);

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

  const isInSelection = useCallback((date: Date) => {
    if (!dragSelection) return false;
    const start = min([dragSelection.startDate, dragSelection.endDate]);
    const end = max([dragSelection.startDate, dragSelection.endDate]);
    return isWithinInterval(date, { start, end });
  }, [dragSelection]);

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
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{ width: `${size.width}px`, height: `${size.height}px` }}
      className={clsx(
        "bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col relative group/calendar",
        isResizing && "ring-2 ring-blue-400"
      )}
    >
      {/* Resize handles - visible on hover */}
      <ResizeHandle direction="n" onResizeStart={handleResizeStart} />
      <ResizeHandle direction="s" onResizeStart={handleResizeStart} />
      <ResizeHandle direction="e" onResizeStart={handleResizeStart} />
      <ResizeHandle direction="w" onResizeStart={handleResizeStart} />
      <ResizeHandle direction="ne" onResizeStart={handleResizeStart} />
      <ResizeHandle direction="nw" onResizeStart={handleResizeStart} />
      <ResizeHandle direction="se" onResizeStart={handleResizeStart} />
      <ResizeHandle direction="sw" onResizeStart={handleResizeStart} />
      
      <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {format(monthDate, 'MMMM yyyy')}
        </h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRemove}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>
      
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {weekDays.map((day, idx) => (
          <div key={idx} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
      {weeks.map((week, weekIndex) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        const weekEvents = getWeekEvents(weekStart, weekEnd);

        return (
          <div key={weekIndex} className="relative flex-1 min-h-0">
            <div className="grid grid-cols-7 h-full">
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
                    className={clsx(
                      'p-0.5 border-b border-r border-gray-100 dark:border-gray-800 transition-all cursor-pointer select-none relative overflow-hidden min-h-[32px]',
                      !inMonth && 'bg-gray-50 dark:bg-gray-900/50',
                      inMonth && 'hover:bg-gray-100 dark:hover:bg-gray-800/50',
                      isSelected && 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 ring-inset',
                      isEventHovering && 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
                      dayIsToday && 'bg-red-50 dark:bg-red-900/10'
                    )}
                  >
                    {dayIsToday && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
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
                        `absolute pointer-events-auto group`,
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
                        {!startsBeforeWeek && (
                          <div
                            onMouseDown={(e) => onResizeStart(event, 'start', effectiveStart, e)}
                            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-gradient-to-r from-white/40 to-transparent transition-opacity"
                          />
                        )}
                        
                        <span className="truncate flex-1 px-0.5">
                          {!startsBeforeWeek && event.title}
                        </span>
                        
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
      </div>
      
      {/* Size indicator on hover */}
      <div className="absolute bottom-1 right-1 opacity-0 group-hover/calendar:opacity-70 text-[9px] text-gray-400 bg-white/80 dark:bg-gray-800/80 px-1 rounded pointer-events-none transition-opacity">
        {Math.round(size.width)}×{Math.round(size.height)}
      </div>
    </motion.div>
  );
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CustomMonthView() {
  const { 
    openEventModal, 
    setCurrentDate,
    cutEvent, 
    copyEvent, 
    clipboardEvent, 
    clearClipboard,
    savedCustomViews,
    saveCustomView,
    updateCustomView,
    deleteCustomView,
    currentCustomViewMonths,
    setCurrentCustomViewMonths,
    isFullscreen,
    toggleFullscreen,
  } = useUIStore();

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

  const [selectedMonths, setSelectedMonths] = useState<SelectedMonth[]>(() => {
    // Restore from persisted state if available
    if (currentCustomViewMonths && currentCustomViewMonths.length > 0) {
      return currentCustomViewMonths.map(m => ({
        year: m.year,
        month: m.month,
        width: m.width,
        height: m.height,
      }));
    }
    // Default to current and next month
    const today = new Date();
    return [
      { year: getYear(today), month: getMonth(today), width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      { year: getYear(addMonths(today, 1)), month: getMonth(addMonths(today, 1)), width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
    ];
  });
  
  // Persist selectedMonths changes to store
  useEffect(() => {
    const months: SavedCustomViewMonth[] = selectedMonths.map(m => ({
      year: m.year,
      month: m.month,
      width: m.width,
      height: m.height,
    }));
    setCurrentCustomViewMonths(months);
  }, [selectedMonths, setCurrentCustomViewMonths]);
  
  const [showSelector, setShowSelector] = useState(false);
  const [selectorYear, setSelectorYear] = useState(getYear(new Date()));
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  
  const [dragSelection, setDragSelection] = useState<DragSelectionState | null>(null);
  const [eventDrag, setEventDrag] = useState<EventDragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ event: PlanEvent; position: { x: number; y: number } } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isDragging = useRef(false);
  const saveDialogRef = useRef<HTMLDivElement>(null);
  const loadMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSaveDialog && saveDialogRef.current && !saveDialogRef.current.contains(e.target as Node)) {
        setShowSaveDialog(false);
        setSaveViewName('');
        setEditingViewId(null);
      }
      if (showLoadMenu && loadMenuRef.current && !loadMenuRef.current.contains(e.target as Node)) {
        setShowLoadMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSaveDialog, showLoadMenu]);

  // Exit fullscreen with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Get sorted months with their data
  const sortedMonths = useMemo(() => {
    return [...selectedMonths].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  }, [selectedMonths]);

  const monthDates = useMemo(() => {
    return sortedMonths.map(m => setMonth(setYear(new Date(), m.year), m.month));
  }, [sortedMonths]);

  const handleMonthSizeChange = useCallback((year: number, month: number, newSize: CalendarSize) => {
    setSelectedMonths(prev => prev.map(m => {
      if (m.year === year && m.month === month) {
        return { ...m, width: newSize.width, height: newSize.height };
      }
      return m;
    }));
  }, []);

  const toggleMonth = (year: number, month: number) => {
    const exists = selectedMonths.some(m => m.year === year && m.month === month);
    if (exists) {
      setSelectedMonths(prev => prev.filter(m => !(m.year === year && m.month === month)));
    } else {
      setSelectedMonths(prev => [...prev, { year, month, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }]);
    }
  };

  const removeMonth = (index: number) => {
    setSelectedMonths(prev => prev.filter((_, i) => i !== index));
  };

  const isMonthSelected = (year: number, month: number) => {
    return selectedMonths.some(m => m.year === year && m.month === month);
  };

  // Save/Load handlers
  const handleSaveView = () => {
    if (!saveViewName.trim()) return;
    const months: SavedCustomViewMonth[] = selectedMonths.map(m => ({
      year: m.year,
      month: m.month,
      width: m.width,
      height: m.height,
    }));
    
    if (editingViewId) {
      updateCustomView(editingViewId, saveViewName.trim(), months);
    } else {
      saveCustomView(saveViewName.trim(), months);
    }
    
    setSaveViewName('');
    setShowSaveDialog(false);
    setEditingViewId(null);
  };

  const handleLoadView = (viewId: string) => {
    const view = savedCustomViews.find(v => v.id === viewId);
    if (view) {
      setSelectedMonths(view.months.map(m => ({
        year: m.year,
        month: m.month,
        width: m.width,
        height: m.height,
      })));
    }
    setShowLoadMenu(false);
  };

  const handleDeleteView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomView(viewId);
  };

  const handleUpdateCurrentView = (viewId: string) => {
    const view = savedCustomViews.find(v => v.id === viewId);
    if (view) {
      setSaveViewName(view.name);
      setEditingViewId(viewId);
      setShowSaveDialog(true);
    }
    setShowLoadMenu(false);
  };

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
      if (dragSelection && isDragging.current) {
        setDragSelection(prev => prev ? { ...prev, endDate: foundDate! } : null);
      }
      if (eventDrag) {
        setEventDrag(prev => prev ? { ...prev, currentDate: foundDate! } : null);
      }
      if (resize) {
        setResize(prev => prev ? { ...prev, currentDate: foundDate! } : null);
      }
    }
  }, [dragSelection, eventDrag, resize]);

  const handleMouseUp = useCallback(() => {
    if (dragSelection && isDragging.current) {
      const start = min([dragSelection.startDate, dragSelection.endDate]);
      const end = max([dragSelection.startDate, dragSelection.endDate]);
      
      if (!isSameDay(start, end) || isDragging.current) {
        setCurrentDate(start);
        openEventModal(undefined, { startDate: start, endDate: end });
      }
      setDragSelection(null);
    }

    if (eventDrag) {
      const event = events.find(e => e.id === eventDrag.eventId);
      if (event) {
        const daysDiff = differenceInDays(eventDrag.currentDate, eventDrag.initialDate);
        if (daysDiff !== 0) {
          const newStart = addDays(new Date(event.startDate), daysDiff);
          const newEnd = addDays(new Date(event.endDate), daysDiff);
          moveEvent(event.id, newStart, newEnd);
        }
      }
      setEventDrag(null);
    }

    if (resize) {
      const event = events.find(e => e.id === resize.eventId);
      if (event) {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        if (resize.edge === 'start') {
          const newStart = startOfDay(resize.currentDate);
          if (newStart <= eventEnd) {
            resizeEvent(event.id, newStart, eventEnd);
          }
        } else {
          const newEnd = startOfDay(resize.currentDate);
          if (newEnd >= eventStart) {
            resizeEvent(event.id, eventStart, newEnd);
          }
        }
      }
      setResize(null);
    }

    isDragging.current = false;
  }, [dragSelection, eventDrag, resize, events, moveEvent, resizeEvent, openEventModal, setCurrentDate]);

  useEffect(() => {
    if (dragSelection || eventDrag || resize) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragSelection, eventDrag, resize, handleMouseMove, handleMouseUp]);

  const handleDayMouseDown = useCallback((date: Date, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    setDragSelection({ startDate: date, endDate: date });
  }, []);

  const handleDayMouseEnter = useCallback((date: Date) => {
    if (dragSelection && isDragging.current) {
      setDragSelection(prev => prev ? { ...prev, endDate: date } : null);
    }
  }, [dragSelection]);

  const handleDayDoubleClick = useCallback((date: Date) => {
    setCurrentDate(date);
    openEventModal();
  }, [setCurrentDate, openEventModal]);

  const handleDayContextMenu = useCallback((date: Date, e: React.MouseEvent) => {
    if (clipboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      pasteEvent(startOfDay(date));
    }
  }, [clipboardEvent, pasteEvent]);

  const handleEventClick = useCallback((event: PlanEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!eventDrag && !resize) {
      setTooltip(null);
      openEventModal(event);
    }
  }, [eventDrag, resize, openEventModal]);

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
      className="space-y-4"
    >
      {/* Month Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Select Months to Display ({selectedMonths.length} selected)
          </h3>
          <div className="flex items-center gap-2">
            {/* Save View Button */}
            <div className="relative" ref={saveDialogRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSaveDialog(!showSaveDialog)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                disabled={selectedMonths.length === 0}
              >
                <Save className="w-4 h-4" />
                Save View
              </motion.button>
              
              {/* Save Dialog */}
              <AnimatePresence>
                {showSaveDialog && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-[250px]"
                  >
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {editingViewId ? 'Update View' : 'Save Current View'}
                    </p>
                    <input
                      type="text"
                      value={saveViewName}
                      onChange={(e) => setSaveViewName(e.target.value)}
                      placeholder="Enter view name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveView();
                        if (e.key === 'Escape') {
                          setShowSaveDialog(false);
                          setSaveViewName('');
                          setEditingViewId(null);
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setShowSaveDialog(false);
                          setSaveViewName('');
                          setEditingViewId(null);
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveView}
                        disabled={!saveViewName.trim()}
                        className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingViewId ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Load View Button */}
            <div className="relative" ref={loadMenuRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowLoadMenu(!showLoadMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                disabled={savedCustomViews.length === 0}
              >
                <FolderOpen className="w-4 h-4" />
                Load View
              </motion.button>
              
              {/* Load Menu */}
              <AnimatePresence>
                {showLoadMenu && savedCustomViews.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[250px]"
                  >
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Saved Views</p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {savedCustomViews.map((view) => (
                        <div
                          key={view.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group"
                          onClick={() => handleLoadView(view.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{view.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {view.months.length} month{view.months.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateCurrentView(view.id);
                              }}
                              className="p-1 text-gray-500 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                              title="Update with current view"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteView(view.id, e)}
                              className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              title="Delete view"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Select Months Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {showSelector ? 'Done' : 'Select Months'}
              <ChevronDown className={clsx('w-4 h-4 transition-transform', showSelector && 'rotate-180')} />
            </motion.button>

            {/* Fullscreen Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleFullscreen}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                isFullscreen 
                  ? "bg-amber-500 hover:bg-amber-600 text-white" 
                  : "bg-gray-600 hover:bg-gray-700 text-white"
              )}
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Mode'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isFullscreen ? 'Exit' : 'Max'}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {showSelector && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {/* Year selector */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectorYear(y => y - 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  <ChevronDown className="w-5 h-5 rotate-90" />
                </motion.button>
                <span className="text-lg font-bold text-gray-800 dark:text-gray-200 min-w-[60px] text-center">
                  {selectorYear}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectorYear(y => y + 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  <ChevronDown className="w-5 h-5 -rotate-90" />
                </motion.button>
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {monthNames.map((name, idx) => {
                  const selected = isMonthSelected(selectorYear, idx);
                  const isCurrentMonth = getYear(new Date()) === selectorYear && getMonth(new Date()) === idx;
                  
                  return (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleMonth(selectorYear, idx)}
                      className={clsx(
                        'relative px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        selected
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
                        isCurrentMonth && !selected && 'ring-2 ring-blue-400'
                      )}
                    >
                      {name}
                      {selected && (
                        <Check className="absolute top-1 right-1 w-3 h-3" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected months preview */}
        {!showSelector && selectedMonths.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedMonths
              .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month))
              .map((m, idx) => (
                <motion.div
                  key={`${m.year}-${m.month}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm"
                >
                  <span>{monthNames[m.month]} {m.year}</span>
                  <button
                    onClick={() => removeMonth(idx)}
                    className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
          </div>
        )}

        {selectedMonths.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
            No months selected. Click &quot;Select Months&quot; to choose which months to display.
          </p>
        )}
      </div>

      {/* Calendar Grid */}
      {selectedMonths.length > 0 && (
        <div className={clsx(
          "flex flex-wrap gap-4 justify-start",
          (dragSelection || eventDrag || resize) && "select-none"
        )}>
          <AnimatePresence mode="popLayout">
            {sortedMonths.map((monthData) => {
              const monthDate = setMonth(setYear(new Date(), monthData.year), monthData.month);
              return (
                <CompactMonth
                  key={`${monthData.year}-${monthData.month}`}
                  monthDate={monthDate}
                  size={{ width: monthData.width, height: monthData.height }}
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
                  onRemove={() => {
                    setSelectedMonths(prev => prev.filter(m => !(m.year === monthData.year && m.month === monthData.month)));
                  }}
                  onSizeChange={(newSize) => handleMonthSizeChange(monthData.year, monthData.month, newSize)}
                  cellRefs={cellRefs}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}

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
              <>Select: {format(min([dragSelection.startDate, dragSelection.endDate]), 'MMM d')} - {format(max([dragSelection.startDate, dragSelection.endDate]), 'MMM d')}</>
            )}
            {resize && <>Resizing: {format(resize.currentDate, 'MMM d, yyyy')}</>}
            {eventDrag && <>Moving to: {format(eventDrag.currentDate, 'MMM d, yyyy')}</>}
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

      <EventContextMenu
        event={contextMenu?.event || null}
        position={contextMenu?.position || null}
        onClose={() => setContextMenu(null)}
        onDelete={deleteEvent}
        onCut={cutEvent}
        onCopy={copyEvent}
        onDuplicate={duplicateEvent}
      />

      <EventTooltip
        event={tooltip?.event || null}
        position={tooltip?.position || null}
      />
    </motion.div>
  );
}
