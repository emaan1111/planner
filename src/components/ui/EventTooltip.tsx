'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { PlanEvent, colorClasses } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { Calendar, Clock, Tag, Flag, FileText } from 'lucide-react';
import clsx from 'clsx';

interface EventTooltipProps {
  event: PlanEvent | null;
  position: { x: number; y: number } | null;
}

const priorityColors = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

export function EventTooltip({ event, position }: EventTooltipProps) {
  if (!event || !position) return null;

  const duration = differenceInDays(new Date(event.endDate), new Date(event.startDate)) + 1;
  const colors = colorClasses[event.color];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 5 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          left: Math.min(position.x, window.innerWidth - 280),
          top: Math.min(position.y + 10, window.innerHeight - 200),
          zIndex: 100,
        }}
        className="glass-tooltip w-64 rounded-xl shadow-2xl overflow-hidden pointer-events-none"
      >
        {/* Color header */}
        <div className={clsx('h-2', colors.bg)} />
        
        <div className="p-3 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {event.title}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Date range */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(event.startDate), 'MMM d')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{duration} day{duration > 1 ? 's' : ''}</span>
          </div>

          {/* Priority */}
          {event.priority && (
            <div className="flex items-center gap-2 text-sm">
              <Flag className={clsx('w-4 h-4', priorityColors[event.priority])} />
              <span className={priorityColors[event.priority]}>
                {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)} priority
              </span>
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-gray-400" />
              {event.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
              {event.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{event.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Notes preview */}
          {event.notes && (
            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{event.notes}</span>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
          Click to edit • Right-click for more options
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
