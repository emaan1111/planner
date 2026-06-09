'use client';

import { useLayoutEffect, useRef, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface AnchoredMenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  width?: number;
  children: React.ReactNode;
}

// Renders a dropdown in a portal anchored under a trigger, so it escapes any
// `overflow-hidden` ancestor (e.g. the group card) instead of being clipped.
export function AnchoredMenu({ anchorRef, open, onClose, align = 'left', width, children }: AnchoredMenuProps) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      const r = anchorRef.current!.getBoundingClientRect();
      const w = width ?? 180;
      let left = align === 'right' ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      // Flip above if not enough room below.
      const estH = menuRef.current?.offsetHeight ?? 220;
      const top = r.bottom + 4 + estH > window.innerHeight ? Math.max(8, r.top - estH - 4) : r.bottom + 4;
      setPos({ left, top });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef, align, width]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button className="fixed inset-0 z-[60] cursor-default" onClick={onClose} aria-hidden tabIndex={-1} />
      <div
        ref={menuRef}
        style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999, width }}
        className="z-[61] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1"
      >
        {children}
      </div>
    </>,
    document.body
  );
}
