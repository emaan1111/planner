'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { PlanEvent } from '@/types';
import clsx from 'clsx';
import { ArrowRight, CheckCircle } from 'lucide-react';

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface EventContextMenuProps {
  event: PlanEvent | null;
  position: ContextMenuPosition | null;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onCut: (event: PlanEvent) => void;
  onCopy: (event: PlanEvent) => void;
  onDuplicate: (event: PlanEvent) => void;
  onMoveToNextDay?: (event: PlanEvent) => void;
  onMarkDone?: (event: PlanEvent) => void;
}

export function EventContextMenu({
  event,
  position,
  onClose,
  onDelete,
  onCut,
  onCopy,
  onDuplicate,
  onMoveToNextDay,
  onMarkDone,
}: EventContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (event && position) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [event, position, onClose]);

  if (!event || !position) return null;

  const menuItems: any[] = [];
  
  if (onMarkDone && event.status !== 'done') {
    menuItems.push({
      label: 'Mark Done',
      icon: <CheckCircle className="w-4 h-4" />,
      onClick: () => {
        onMarkDone(event);
        onClose();
      },
    });
  }

  if (onMoveToNextDay) {
    menuItems.push({
      label: 'Move to Next Day',
      icon: <ArrowRight className="w-4 h-4" />,
      onClick: () => {
        onMoveToNextDay(event);
        onClose();
      },
    });
  }

  if (menuItems.length > 0) {
    menuItems.push({ type: 'separator' });
  }

  menuItems.push(
    {
      label: 'Cut',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
      ),
      shortcut: '⌘X',
      onClick: () => {
        onCut(event);
        onClose();
      },
    },
    {
      label: 'Copy',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      shortcut: '⌘C',
      onClick: () => {
        onCopy(event);
        onClose();
      },
    },
    {
      label: 'Duplicate',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
      shortcut: '⌘D',
      onClick: () => {
        onDuplicate(event);
        onClose();
      },
    },
    { type: 'separator' as const },
    {
      label: 'Delete',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      shortcut: '⌫',
      onClick: () => {
        onDelete(event.id);
        onClose();
      },
      danger: true,
    },
  ];

  // Adjust position to keep menu within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 250),
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{
          position: 'fixed',
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          zIndex: 9999,
        }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] overflow-hidden"
      >
        {/* Event title header */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {event.title}
          </p>
        </div>

        {/* Menu items */}
        <div className="py-1">
          {menuItems.map((item, index) => {
            if ('type' in item && item.type === 'separator') {
              return (
                <div
                  key={`sep-${index}`}
                  className="my-1 border-t border-gray-100 dark:border-gray-700"
                />
              );
            }

            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={clsx(
                  'w-full px-3 py-2 flex items-center justify-between text-sm transition-colors',
                  item.danger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {item.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
