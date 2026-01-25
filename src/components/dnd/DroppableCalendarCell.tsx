'use client';

import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { ReactNode, useCallback } from 'react';

interface DroppableCalendarCellProps {
  date: Date;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  cellRef?: (el: HTMLDivElement | null) => void;
}

export function DroppableCalendarCell({
  date,
  children,
  className,
  onClick,
  onDoubleClick,
  onContextMenu,
  cellRef,
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
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={clsx(
        className,
        isOver && 'ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/30'
      )}
    >
      {children}
    </div>
  );
}
