'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, startOfYear, eachMonthOfInterval, endOfYear, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isWithinInterval } from 'date-fns';
import { useUIStore } from '@/store/uiStore';
import { useEvents } from '@/hooks/useEventsQuery';
import { PlanEvent, colorClasses } from '@/types';
import { useMemo, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { expandRecurringEvents } from '@/utils/recurrence';
import { DaySummaryTooltip } from '@/components/ui/DaySummaryTooltip';

interface YearMonthProps {
  monthDate: Date;
  onClick: () => void;
  onDayClick: (date: Date) => void;
  onDayDoubleClick: (date: Date) => void;
  onDayMouseEnter: (date: Date, events: PlanEvent[], e: React.MouseEvent) => void;
  onDayMouseLeave: () => void;
}

function YearMonth({ monthDate, onClick, onDayClick, onDayDoubleClick, onDayMouseEnter, onDayMouseLeave }: YearMonthProps) {
  const { selectedPlanTypes } = useUIStore();
  const { data: events = [] } = useEvents();
  
  const expandedEvents = useMemo(() => {
    if (events.length === 0) return [];
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return expandRecurringEvents(events, start, end);
  }, [events, monthDate]);
  
  const getEventsForDate = (date: Date) => {
    return expandedEvents.filter(
      (event) =>
        (selectedPlanTypes.length === 0 || !event.planType || selectedPlanTypes.includes(event.planType)) &&
        isWithinInterval(date, { start: event.startDate, end: event.endDate })
    );
  };
  
  const getEventsForDateRange = (start: Date, end: Date) => {
    return expandedEvents.filter(
      (event) =>
        (selectedPlanTypes.length === 0 || !event.planType || selectedPlanTypes.includes(event.planType)) &&
        (isWithinInterval(event.startDate, { start, end }) ||
          isWithinInterval(event.endDate, { start, end }) ||
          (event.startDate <= start && event.endDate >= end))
    );
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  const monthEvents = useMemo(() => {
    return getEventsForDateRange(startOfMonth(monthDate), endOfMonth(monthDate));
  }, [monthDate, getEventsForDateRange]);

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-3 cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-700"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {format(monthDate, 'MMMM')}
        </h3>
        {monthEvents.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium"
          >
            {monthEvents.length}
          </motion.span>
        )}
      </div>

      {/* Mini week headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map((day, idx) => (
          <div key={idx} className="text-center text-[10px] text-gray-400 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Mini days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((date) => {
          const events = getEventsForDate(date);
          const dayIsToday = isToday(date);
          const inMonth = isSameMonth(date, monthDate);
          const hasEvents = events.length > 0;

          return (
            <div
              key={date.toISOString()}
              onClick={(e) => {
                e.stopPropagation();
                onDayClick(date);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onDayDoubleClick(date);
              }}
              onMouseEnter={(e) => onDayMouseEnter(date, events, e)}
              onMouseLeave={onDayMouseLeave}
              className={clsx(
                'aspect-square flex items-center justify-center rounded text-[10px] cursor-pointer',
                dayIsToday && 'bg-blue-500 text-white font-bold',
                !dayIsToday && inMonth && 'text-gray-600 dark:text-gray-400',
                !inMonth && 'text-gray-300 dark:text-gray-700',
                hasEvents && !dayIsToday && inMonth && 'font-semibold'
              )}
            >
              {format(date, 'd')}
              {hasEvents && !dayIsToday && (
                <span className="absolute w-1 h-1 bg-blue-400 rounded-full -mt-2 ml-2" />
              )}
            </div>
          );
        })}
      </div>

      {/* Event summary dots */}
      {monthEvents.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {monthEvents.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className={clsx(
                'w-2 h-2 rounded-full',
                colorClasses[event.color].bg,
                (event.status === 'done' || event.status === 'no-action') && 'opacity-60 grayscale'
              )}
              title={`${event.title}${event.status && event.status !== 'scheduled' ? ` (${event.status})` : ''}`}
            />
          ))}
          {monthEvents.length > 5 && (
            <span className="text-[10px] text-gray-400">+{monthEvents.length - 5}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function YearView() {
  const { currentDate, setCurrentDate, setViewMode, openEventModal } = useUIStore();
  const router = useRouter();
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const [daySummary, setDaySummary] = useState<{ date: Date; events: PlanEvent[]; position: { x: number; y: number } } | null>(null);
  const summaryTimeout = useRef<NodeJS.Timeout | null>(null);

  const months = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    return eachMonthOfInterval({ start: yearStart, end: yearEnd });
  }, [currentDate]);

  const handleDayMouseEnter = useCallback((date: Date, events: PlanEvent[], e: React.MouseEvent) => {
    if (events.length > 0) {
      if (summaryTimeout.current) {
        clearTimeout(summaryTimeout.current);
        summaryTimeout.current = null;
      }
      setDaySummary({
        date,
        events: events.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
        position: { x: e.clientX + 10, y: e.clientY + 10 }
      });
    }
  }, []);

  const handleDayMouseLeave = useCallback(() => {
    if (summaryTimeout.current) clearTimeout(summaryTimeout.current);
    summaryTimeout.current = setTimeout(() => {
      setDaySummary(null);
    }, 300);
  }, []);

  const handleMonthClick = (monthDate: Date) => {
    setCurrentDate(monthDate);
    setViewMode('month');
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
    }
    clickTimeout.current = setTimeout(() => {
      openEventModal();
    }, 220);
  };

  const handleDayDoubleClick = (date: Date) => {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
    }
    setCurrentDate(date);
    router.push(`/day/${format(date, 'yyyy-MM-dd')}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          {format(currentDate, 'yyyy')}
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {months.map((monthDate, index) => (
            <motion.div
              key={monthDate.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.03 }}
            >
              <YearMonth
                monthDate={monthDate}
                onClick={() => handleMonthClick(monthDate)}
                onDayClick={handleDayClick}
                onDayDoubleClick={handleDayDoubleClick}
                onDayMouseEnter={handleDayMouseEnter}
                onDayMouseLeave={handleDayMouseLeave}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

       {/* Day Summary Tooltip */}
       <DaySummaryTooltip
        date={daySummary?.date || null}
        events={daySummary?.events || []}
        position={daySummary?.position || null}
        onMouseEnter={() => {
            if (summaryTimeout.current) {
                clearTimeout(summaryTimeout.current);
                summaryTimeout.current = null;
            }
        }}
        onMouseLeave={() => {
            setDaySummary(null);
        }}
      />
    </motion.div>
  );
}
