'use client';

import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { ReactNode, useCallback, HTMLAttributes } from 'react';

interface DroppableCalendarCellProps extends HTMLAttributes<HTMLDivElement> {
  date: Date;
  children: ReactNode;
  cellRef?: (el: HTMLDivElement | null) => void;
}

export function DroppableCalendarCell({
  date,
  children,
  className,
  cellRef,
  ...props
}: DroppableCalendarCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `calendar-day-${date.toISOString()}`,
    data: { date },
  });

  // Combine both refs
  const combinedRef = useCallback((el: HTMLDivElement | null) => {
    setNodeRef(el);
    cellRef?.(el);
  }, [setNodeRef, cellRef]);

  return (
    <div
      ref={combinedRef}
      className={clsx(
        className,
        isOver && 'ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/30'
      )}
      {...props}
    >
      {children}
    </div>
  );
}
