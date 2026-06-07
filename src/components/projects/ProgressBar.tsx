'use client';

import clsx from 'clsx';
import { colorClasses, EventColor } from '@/types';

interface ProgressBarProps {
  percent: number;
  color?: EventColor;
  className?: string;
  showLabel?: boolean;
}

// Thin monday-style progress bar tinted with the project color.
export function ProgressBar({ percent, color = 'green', className, showLabel = true }: ProgressBarProps) {
  const fill = colorClasses[color]?.bg ?? 'bg-green-500';
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden min-w-[60px]">
        <div
          className={clsx('h-full rounded-full transition-all duration-300', fill)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums w-9 text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
