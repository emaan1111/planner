'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DocSlide } from '@/types/docs';

interface Props {
  slides: DocSlide[];
  htmlById: Map<string, string>;
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}

// A read-only, enlarged view of a single slide — open from the grid to read the
// whole thing, then flip through with the arrows or the keyboard.
export function SlideModal({ slides, htmlById, index, onIndex, onClose }: Props) {
  const open = index !== null;

  useEffect(() => {
    if (!open || index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && index < slides.length - 1) onIndex(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, index, slides.length, onIndex, onClose]);

  const slide = index !== null ? slides[index] : null;

  return (
    <AnimatePresence>
      {open && slide && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-10"
          onClick={onClose}
        >
          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); if (index! > 0) onIndex(index! - 1); }}
            disabled={index === 0}
            className="absolute left-3 sm:left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition-colors"
            title="Previous slide (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl aspect-video flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900"
            style={slide.color ? { backgroundColor: slide.color } : undefined}
          >
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">
                {index! + 1} / {slides.length}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-gray-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-10 sm:px-14 py-12">
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                {slide.title || <span className="text-gray-300 dark:text-gray-600 font-normal">Untitled slide</span>}
              </h2>
              <div className="space-y-2 text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                {slide.blockIds.slice(1).map((id) => (
                  <div key={id} className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: htmlById.get(id) || '<br>' }} />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); if (index! < slides.length - 1) onIndex(index! + 1); }}
            disabled={index === slides.length - 1}
            className="absolute right-3 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 transition-colors"
            title="Next slide (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
