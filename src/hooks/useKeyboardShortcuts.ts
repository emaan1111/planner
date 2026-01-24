'use client';

import { useEffect, useCallback } from 'react';
import { usePlannerStore } from '@/store/plannerStore';

export function useKeyboardShortcuts() {
  const {
    openEventModal,
    closeEventModal,
    isEventModalOpen,
    goToNextPeriod,
    goToPreviousPeriod,
    goToToday,
    toggleSidebar,
    toggleAIAssistant,
    undo,
    redo,
    canUndo,
    canRedo,
  } = usePlannerStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input, textarea, or contenteditable
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // But allow Escape to close modal
      if (e.key === 'Escape' && isEventModalOpen) {
        e.preventDefault();
        closeEventModal();
      }
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    // Escape - Close modal
    if (e.key === 'Escape') {
      if (isEventModalOpen) {
        e.preventDefault();
        closeEventModal();
      }
      return;
    }

    // Cmd+Z - Undo
    if (cmdKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo()) {
        undo();
      }
      return;
    }

    // Cmd+Shift+Z or Cmd+Y - Redo
    if (cmdKey && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      if (canRedo()) {
        redo();
      }
      return;
    }

    // Don't process other shortcuts if modal is open
    if (isEventModalOpen) return;

    switch (e.key) {
      case 'n':
      case 'N':
        // N - New event
        if (!cmdKey) {
          e.preventDefault();
          openEventModal();
        }
        break;

      case 'ArrowLeft':
        // ← - Previous period
        e.preventDefault();
        goToPreviousPeriod();
        break;

      case 'ArrowRight':
        // → - Next period
        e.preventDefault();
        goToNextPeriod();
        break;

      case 't':
      case 'T':
        // T - Go to today
        e.preventDefault();
        goToToday();
        break;

      case 'b':
      case 'B':
        // B - Toggle sidebar
        e.preventDefault();
        toggleSidebar();
        break;

      case 'a':
      case 'A':
        // A - Toggle AI assistant
        if (!cmdKey) {
          e.preventDefault();
          toggleAIAssistant();
        }
        break;

      case '?':
        // ? - Show keyboard shortcuts help (future feature)
        e.preventDefault();
        // Could show a modal with shortcuts
        break;
    }
  }, [
    isEventModalOpen,
    openEventModal,
    closeEventModal,
    goToNextPeriod,
    goToPreviousPeriod,
    goToToday,
    toggleSidebar,
    toggleAIAssistant,
    undo,
    redo,
    canUndo,
    canRedo,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
