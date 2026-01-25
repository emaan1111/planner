'use client';

import { motion } from 'framer-motion';
import { format, addMonths } from 'date-fns';
import { useUIStore } from '@/store/uiStore';
import { ViewMode } from '@/types';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarRange, Grid3X3, Settings2, Sparkles, Menu, LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

const viewModeConfig: { mode: ViewMode | 'day'; label: string; icon: typeof Calendar }[] = [
  { mode: 'day', label: 'Day', icon: LayoutList },
  { mode: 'month', label: 'Month', icon: Calendar },
  { mode: 'multi-month', label: '3 Months', icon: CalendarRange },
  { mode: 'six-month', label: '6 Months', icon: Grid3X3 },
  { mode: 'year', label: 'Year', icon: CalendarDays },
  { mode: 'custom', label: 'Custom', icon: Settings2 },
];

export function CalendarHeader() {
  const {
    currentDate,
    viewMode,
    setViewMode,
    goToToday,
    goToNextPeriod,
    goToPreviousPeriod,
    toggleAIAssistant,
    toggleSidebar,
    isAIAssistantOpen,
    violations,
  } = useUIStore();
  const router = useRouter();

  const handleViewChange = (mode: ViewMode | 'day') => {
    if (mode === 'day') {
      router.push(`/day/${format(currentDate, 'yyyy-MM-dd')}`);
    } else {
      setViewMode(mode as ViewMode);
    }
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'multi-month':
        return `${format(currentDate, 'MMM')} - ${format(addMonths(currentDate, 2), 'MMM yyyy')}`;
      case 'six-month':
        return `${format(currentDate, 'MMM')} - ${format(addMonths(currentDate, 5), 'MMM yyyy')}`;
      case 'year':
        return format(currentDate, 'yyyy');
      case 'custom':
        return 'Custom View';
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40"
    >
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </motion.button>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={goToPreviousPeriod}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </motion.button>

              <motion.h1
                key={getTitle()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100 min-w-[200px] text-center"
              >
                {getTitle()}
              </motion.h1>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={goToNextPeriod}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goToToday}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/25 transition-colors"
            >
              Today
            </motion.button>
          </div>

          {/* Center - View mode toggle */}
          <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {viewModeConfig.map(({ mode, label, icon: Icon }) => (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleViewChange(mode)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  viewMode === mode && mode !== 'day'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden lg:inline">{label}</span>
              </motion.button>
            ))}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {violations.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium"
              >
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                {violations.length} conflict{violations.length > 1 ? 's' : ''}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleAIAssistant}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all',
                isAIAssistantOpen
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 hover:from-purple-500/20 hover:to-pink-500/20'
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden lg:inline">AI Assistant</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
