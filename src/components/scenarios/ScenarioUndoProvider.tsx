'use client';

import { create } from 'zustand';
import { useEffect, ReactNode } from 'react';
import { toast } from '@/components/ui/Toast';

// Each entry knows how to redo what it just undid (the action that was taken),
// and how to apply that "undo" by calling a restore function.
export interface UndoEntry {
  label: string;
  undo: () => Promise<void> | void;
}

interface UndoState {
  stack: UndoEntry[];
  push: (entry: UndoEntry) => void;
  popAndUndo: () => Promise<void>;
  clear: () => void;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  stack: [],
  push: (entry) => set((s) => ({ stack: [...s.stack, entry].slice(-50) })),
  popAndUndo: async () => {
    const stack = get().stack;
    if (stack.length === 0) return;
    const entry = stack[stack.length - 1];
    set({ stack: stack.slice(0, -1) });
    try {
      await entry.undo();
      toast.success(`Undone: ${entry.label}`);
    } catch {
      toast.error('Undo failed');
    }
  },
  clear: () => set({ stack: [] }),
}));

export function ScenarioUndoProvider({ children }: { children: ReactNode }) {
  const popAndUndo = useUndoStore((s) => s.popAndUndo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && !e.shiftKey && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement | null;
        // Don't intercept when typing in inputs / contenteditable
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
        e.preventDefault();
        popAndUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [popAndUndo]);

  return <>{children}</>;
}
