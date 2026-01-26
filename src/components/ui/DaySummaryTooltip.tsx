'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PlanEvent, colorClasses } from '@/types';
import { format } from 'date-fns';
import clsx from 'clsx';
import { MapPin, Clock } from 'lucide-react';

interface DaySummaryTooltipProps {
  date: Date | null;
  events: PlanEvent[];
  position: { x: number; y: number } | null;
  onClose?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function DaySummaryTooltip({ date, events, position, onMouseEnter, onMouseLeave }: DaySummaryTooltipProps) {
  if (!date || !position || events.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          position: 'fixed',
          left: Math.min(position.x, window.innerWidth - 250), // Prevent overflow right
          top: Math.min(position.y, window.innerHeight - 300),  // Prevent overflow bottom
          zIndex: 60,
        }}
        className="w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
      >
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {format(date, 'MMM d, yyyy')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {events.length} events
          </p>
        </div>
        
        <div className="py-2 overflow-y-auto max-h-[400px]">
          {events.map((event) => {
            const colors = colorClasses[event.color];
            return (
              <div key={event.id} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-default">
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx("w-2 h-2 rounded-full", colors.bg)} />
                  <span className={clsx(
                    "text-sm font-medium truncate",
                    event.status === 'done' ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"
                  )}>
                    {event.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {event.isAllDay ? 'All Day' : `${format(event.startDate, 'h:mm a')} - ${format(event.endDate, 'h:mm a')}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
