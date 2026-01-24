'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, startOfYear, eachMonthOfInterval, endOfYear, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday } from 'date-fns';
import { usePlannerStore } from '@/store/plannerStore';
import { PlanEvent, colorClasses } from '@/types';
import { useMemo } from 'react';
import clsx from 'clsx';

interface YearMonthProps {
  monthDate: Date;
  onClick: () => void;
}

function YearMonth({ monthDate, onClick }: YearMonthProps) {
  const { getEventsForDate, getEventsForDateRange } = usePlannerStore();

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
              className={clsx(
                'aspect-square flex items-center justify-center rounded text-[10px]',
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
              className={clsx('w-2 h-2 rounded-full', colorClasses[event.color].bg)}
              title={event.title}
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
  const { currentDate, setCurrentDate, setViewMode } = usePlannerStore();

  const months = useMemo(() => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    return eachMonthOfInterval({ start: yearStart, end: yearEnd });
  }, [currentDate]);

  const handleMonthClick = (monthDate: Date) => {
    setCurrentDate(monthDate);
    setViewMode('month');
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
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
