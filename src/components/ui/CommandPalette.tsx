'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlannerStore } from '@/store/plannerStore';
import { Search, Calendar, Plus, Clock, Tag, ArrowRight, Command } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { colorClasses } from '@/types';

interface CommandItem {
  id: string;
  type: 'event' | 'action' | 'navigation';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    events,
    openEventModal,
    goToToday,
    goToNextPeriod,
    goToPreviousPeriod,
    setViewMode,
    toggleSidebar,
    toggleAIAssistant,
    setCurrentDate,
    planTypes,
  } = usePlannerStore();

  // Open with Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setQuery('');
        setSelectedIndex(0);
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Build command items
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Actions
    items.push(
      {
        id: 'new-event',
        type: 'action',
        title: 'New Event',
        subtitle: 'Create a new calendar event',
        icon: <Plus className="w-4 h-4" />,
        action: () => {
          openEventModal();
          setIsOpen(false);
        },
      },
      {
        id: 'today',
        type: 'navigation',
        title: 'Go to Today',
        subtitle: format(new Date(), 'MMMM d, yyyy'),
        icon: <Calendar className="w-4 h-4" />,
        action: () => {
          goToToday();
          setIsOpen(false);
        },
      },
      {
        id: 'month-view',
        type: 'navigation',
        title: 'Month View',
        icon: <Calendar className="w-4 h-4" />,
        action: () => {
          setViewMode('month');
          setIsOpen(false);
        },
      },
      {
        id: 'multi-month-view',
        type: 'navigation',
        title: '3-Month View',
        icon: <Calendar className="w-4 h-4" />,
        action: () => {
          setViewMode('multi-month');
          setIsOpen(false);
        },
      },
      {
        id: 'year-view',
        type: 'navigation',
        title: 'Year View',
        icon: <Calendar className="w-4 h-4" />,
        action: () => {
          setViewMode('year');
          setIsOpen(false);
        },
      },
      {
        id: 'toggle-sidebar',
        type: 'action',
        title: 'Toggle Sidebar',
        icon: <ArrowRight className="w-4 h-4" />,
        action: () => {
          toggleSidebar();
          setIsOpen(false);
        },
      },
      {
        id: 'toggle-ai',
        type: 'action',
        title: 'Toggle AI Assistant',
        icon: <Command className="w-4 h-4" />,
        action: () => {
          toggleAIAssistant();
          setIsOpen(false);
        },
      }
    );

    // Events (searchable)
    events.forEach((event) => {
      const planType = planTypes.find((pt) => pt.name === event.planType);
      items.push({
        id: `event-${event.id}`,
        type: 'event',
        title: event.title,
        subtitle: `${format(new Date(event.startDate), 'MMM d')} - ${format(new Date(event.endDate), 'MMM d, yyyy')}`,
        icon: <Clock className="w-4 h-4" />,
        color: event.color,
        action: () => {
          setCurrentDate(new Date(event.startDate));
          openEventModal(event);
          setIsOpen(false);
        },
      });
    });

    return items;
  }, [events, openEventModal, goToToday, setViewMode, toggleSidebar, toggleAIAssistant, setCurrentDate, planTypes]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands.slice(0, 10);
    const lower = query.toLowerCase();
    return commands
      .filter(
        (cmd) =>
          cmd.title.toLowerCase().includes(lower) ||
          cmd.subtitle?.toLowerCase().includes(lower)
      )
      .slice(0, 10);
  }, [commands, query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
      }
    },
    [filteredCommands, selectedIndex]
  );

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[201]"
          >
            <div className="glass-panel mx-4 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search events, actions..."
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
                <kbd className="hidden sm:block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded text-gray-500">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[300px] overflow-y-auto py-2">
                {filteredCommands.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No results found
                  </div>
                ) : (
                  filteredCommands.map((cmd, index) => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        index === selectedIndex
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      )}
                    >
                      <div
                        className={clsx(
                          'p-2 rounded-lg',
                          cmd.color
                            ? colorClasses[cmd.color as keyof typeof colorClasses]?.bg || 'bg-gray-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        )}
                      >
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {cmd.title}
                        </div>
                        {cmd.subtitle && (
                          <div className="text-sm text-gray-500 truncate">
                            {cmd.subtitle}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {cmd.type}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
