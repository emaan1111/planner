'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Plus, Scissors, X, Layers, ChevronRight } from 'lucide-react';
import { DocBlock } from '@/types/docs';
import {
  getSlides,
  updateBlockText,
  insertBlockAfter,
  mergeWithPrevious,
  groupIntoSlide,
  startSlideAt,
  ungroupSlide,
  setSlideTitle,
} from '@/lib/docModel';
import { AutoGrowTextarea } from './AutoGrowTextarea';

interface Props {
  blocks: DocBlock[];
  onChangeBlocks: (blocks: DocBlock[]) => void;
}

// Pending focus instruction applied after a structural change (insert/merge).
type PendingFocus = { id: string; caret?: number } | null;

export function DocumentView({ blocks, onChangeBlocks }: Props) {
  const slides = useMemo(() => getSlides(blocks), [blocks]);
  // Map every block id to the index of the slide it belongs to (for striping).
  const slideOfBlock = useMemo(() => {
    const map = new Map<string, number>();
    slides.forEach((s, i) => s.blockIds.forEach((id) => map.set(id, i)));
    return map;
  }, [slides]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  // Queued focus instruction lives in a ref so applying it never re-renders.
  const pendingFocus = useRef<PendingFocus>(null);

  const textareas = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // After the blocks prop changes (insert/merge), move focus to the queued block.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = textareas.current.get(target.id);
    if (el) {
      el.focus();
      const caret = target.caret ?? el.value.length;
      el.setSelectionRange(caret, caret);
    }
  }, [blocks]);

  // Selection can contain ids that were since removed; intersect with the live
  // blocks at read time rather than syncing state in an effect.
  const liveIds = useMemo(() => new Set(blocks.map((b) => b.id)), [blocks]);
  const activeSelected = useMemo(
    () => new Set([...selected].filter((id) => liveIds.has(id))),
    [selected, liveIds]
  );

  const handleText = (id: string, text: string) => onChangeBlocks(updateBlockText(blocks, id, text));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    const target = e.currentTarget;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const { blocks: next, newId } = insertBlockAfter(blocks, id);
      onChangeBlocks(next);
      pendingFocus.current = { id: newId, caret: 0 };
    } else if (e.key === 'Backspace' && target.selectionStart === 0 && target.selectionEnd === 0) {
      const index = blocks.findIndex((b) => b.id === id);
      if (index > 0) {
        e.preventDefault();
        const { blocks: next, mergedIntoId, caret } = mergeWithPrevious(blocks, id);
        onChangeBlocks(next);
        if (mergedIntoId) pendingFocus.current = { id: mergedIntoId, caret };
      }
    }
  };

  // Click the gutter dot to (range-)select blocks for grouping.
  const toggleSelect = (id: string, withShift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (withShift && anchor) {
        const ids = blocks.map((b) => b.id);
        const a = ids.indexOf(anchor);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(ids[i]);
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAnchor(id);
  };

  // Selection must be a single contiguous run to become one slide.
  const selectionIsContiguous = useMemo(() => {
    if (activeSelected.size === 0) return false;
    const indices = blocks.map((b, i) => (activeSelected.has(b.id) ? i : -1)).filter((i) => i >= 0);
    return indices[indices.length - 1] - indices[0] === indices.length - 1;
  }, [activeSelected, blocks]);

  const makeSlideFromSelection = () => {
    const indices = blocks.map((b, i) => (activeSelected.has(b.id) ? i : -1)).filter((i) => i >= 0);
    if (!indices.length) return;
    const firstBlock = blocks[indices[0]];
    const suggested = firstBlock.text.trim().slice(0, 60);
    const title = window.prompt('Slide headline', firstBlock.slideTitle || suggested || '');
    if (title === null) return;
    onChangeBlocks(groupIntoSlide(blocks, [...activeSelected], title));
    setSelected(new Set());
    setAnchor(null);
  };

  return (
    <div className="relative">
      {/* Floating action bar for the current selection */}
      {activeSelected.size > 0 && (
        <div className="sticky top-2 z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900 text-white shadow-lg text-sm">
            <span>{activeSelected.size} line{activeSelected.size === 1 ? '' : 's'} selected</span>
            <button
              onClick={makeSlideFromSelection}
              disabled={!selectionIsContiguous}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              title={selectionIsContiguous ? 'Group selected lines into one slide' : 'Select lines that are next to each other'}
            >
              <Layers className="w-3.5 h-3.5" />
              Make slide
            </button>
            <button
              onClick={() => { setSelected(new Set()); setAnchor(null); }}
              className="p-1 rounded-full hover:bg-white/10"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {blocks.map((block, index) => {
          const opensSlide = index === 0 || block.slideStart;
          const slideIndex = slideOfBlock.get(block.id) ?? 0;
          const isSelected = activeSelected.has(block.id);
          return (
            <div key={block.id}>
              {opensSlide && (
                <SlideHeader
                  index={slideIndex}
                  title={block.slideTitle ?? ''}
                  canUnmerge={index !== 0}
                  onTitle={(t) => onChangeBlocks(setSlideTitle(blocks, block.id, t))}
                  onUnmerge={() => onChangeBlocks(ungroupSlide(blocks, block.id))}
                />
              )}
              <div
                className={clsx(
                  'group flex items-start gap-2 rounded-md pr-2 transition-colors',
                  isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900/40',
                  // Subtle left border tints alternating slides so boundaries are visible while writing.
                  slideIndex % 2 === 0
                    ? 'border-l-2 border-indigo-200 dark:border-indigo-900'
                    : 'border-l-2 border-purple-200 dark:border-purple-900'
                )}
              >
                {/* Gutter: selection dot + per-line actions */}
                <div className="flex items-center gap-1 pt-2 pl-1 select-none">
                  <button
                    onClick={(e) => toggleSelect(block.id, e.shiftKey)}
                    className={clsx(
                      'w-3.5 h-3.5 rounded-full border-2 transition-colors',
                      isSelected
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                    )}
                    title="Select line (shift-click for a range)"
                  />
                  {!opensSlide && (
                    <button
                      onClick={() => onChangeBlocks(startSlideAt(blocks, block.id))}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-all"
                      title="Start a new slide here"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <AutoGrowTextarea
                  ref={(el) => {
                    if (el) textareas.current.set(block.id, el);
                    else textareas.current.delete(block.id);
                  }}
                  value={block.text}
                  onChange={(e) => handleText(block.id, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, block.id)}
                  placeholder={index === 0 && blocks.length === 1 ? 'Start writing…' : ''}
                  className="flex-1 resize-none bg-transparent py-2 leading-relaxed text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add a paragraph at the very end */}
      <button
        onClick={() => {
          const last = blocks[blocks.length - 1];
          const { blocks: next, newId } = insertBlockAfter(blocks, last.id);
          onChangeBlocks(next);
          pendingFocus.current = { id: newId, caret: 0 };
        }}
        className="mt-3 ml-3 flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-500 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add paragraph
      </button>
    </div>
  );
}

function SlideHeader({
  index,
  title,
  canUnmerge,
  onTitle,
  onUnmerge,
}: {
  index: number;
  title: string;
  canUnmerge: boolean;
  onTitle: (t: string) => void;
  onUnmerge: () => void;
}) {
  return (
    <div className="group/header flex items-center gap-2 mt-5 mb-1 pl-1">
      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 shrink-0">
        <ChevronRight className="w-3.5 h-3.5" />
        Slide {index + 1}
      </span>
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Slide headline…"
        className="flex-1 bg-transparent text-base font-semibold text-gray-900 dark:text-gray-100 outline-none border-b border-transparent focus:border-indigo-300 dark:focus:border-indigo-700 placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:font-normal"
      />
      {canUnmerge && (
        <button
          onClick={onUnmerge}
          className="opacity-0 group-hover/header:opacity-100 text-gray-300 hover:text-red-500 transition-all"
          title="Remove this slide break (merge into the slide above)"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
