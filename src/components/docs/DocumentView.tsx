'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Plus, Scissors, X, Layers, ChevronRight, Copy } from 'lucide-react';
import { DocBlock, DocSlide } from '@/types/docs';
import {
  getSlides,
  insertBlockAfter,
  groupIntoSlide,
  startSlideAt,
  ungroupSlide,
  setSlideTitle,
  setSlideColor,
} from '@/lib/docModel';
import { RichBlock } from './RichBlock';
import { FormatToolbar, SlideColorMenu } from './DocFormatting';
import { useBlockEditing } from './useBlockEditing';
import { htmlToPlainText, copyText } from './richText';
import { toast } from '@/components/ui/Toast';

interface Props {
  blocks: DocBlock[];
  onChangeBlocks: (blocks: DocBlock[]) => void;
}

export function DocumentView({ blocks, onChangeBlocks }: Props) {
  const slides = useMemo(() => getSlides(blocks), [blocks]);
  const indexOf = useMemo(() => new Map(blocks.map((b, i) => [b.id, i])), [blocks]);
  const blockById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);

  const { registerEditor, handleInput, handleKeyDown, applyFormat, pendingFocusRef } = useBlockEditing(blocks, onChangeBlocks);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);

  const liveIds = useMemo(() => new Set(blocks.map((b) => b.id)), [blocks]);
  const activeSelected = useMemo(
    () => new Set([...selected].filter((id) => liveIds.has(id))),
    [selected, liveIds]
  );

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

  const selectionIsContiguous = useMemo(() => {
    if (activeSelected.size === 0) return false;
    const indices = blocks.map((b, i) => (activeSelected.has(b.id) ? i : -1)).filter((i) => i >= 0);
    return indices[indices.length - 1] - indices[0] === indices.length - 1;
  }, [activeSelected, blocks]);

  // --- Copying to the clipboard (plain text) ----------------------------
  const slideToText = (slide: DocSlide) => {
    const body = slide.blockIds.map((id) => htmlToPlainText(blockById.get(id)?.text ?? '')).join('\n');
    return slide.title ? `${slide.title}\n${body}` : body;
  };

  const copyAll = async () => {
    const text = slides.map(slideToText).join('\n\n').trim();
    if (await copyText(text)) toast.success('Copied all text');
    else toast.error('Copy failed');
  };

  const copySelection = async () => {
    const ids = blocks.filter((b) => activeSelected.has(b.id)).map((b) => b.id);
    const text = ids.map((id) => htmlToPlainText(blockById.get(id)?.text ?? '')).join('\n').trim();
    if (await copyText(text)) toast.success(`Copied ${ids.length} line${ids.length === 1 ? '' : 's'}`);
    else toast.error('Copy failed');
  };

  const copySlide = async (slide: DocSlide) => {
    if (await copyText(slideToText(slide).trim())) toast.success('Copied slide');
    else toast.error('Copy failed');
  };

  const makeSlideFromSelection = () => {
    const indices = blocks.map((b, i) => (activeSelected.has(b.id) ? i : -1)).filter((i) => i >= 0);
    if (!indices.length) return;
    const firstBlock = blocks[indices[0]];
    const suggested = (firstBlock.text || '').replace(/<[^>]*>/g, '').trim().slice(0, 60);
    const title = window.prompt('Slide headline', firstBlock.slideTitle || suggested || '');
    if (title === null) return;
    onChangeBlocks(groupIntoSlide(blocks, [...activeSelected], title));
    setSelected(new Set());
    setAnchor(null);
  };

  return (
    <div className="relative">
      <FormatToolbar onCommand={applyFormat} onCopyAll={copyAll} />

      {/* Floating action bar for the current line selection */}
      {activeSelected.size > 0 && (
        <div className="sticky top-[104px] z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900 text-white shadow-lg text-sm">
            <span>{activeSelected.size} line{activeSelected.size === 1 ? '' : 's'} selected</span>
            <button
              onClick={copySelection}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Copy selected lines"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
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

      <div className="space-y-3">
        {slides.map((slide, si) => (
          <div
            key={slide.id}
            className={clsx(
              'rounded-lg border-l-2 pl-1 pr-1 py-1 transition-colors',
              si % 2 === 0 ? 'border-indigo-200 dark:border-indigo-900' : 'border-purple-200 dark:border-purple-900'
            )}
            style={slide.color ? { backgroundColor: slide.color } : undefined}
          >
            <SlideHeader
              index={si}
              title={slide.title}
              color={slide.color}
              canUnmerge={si !== 0}
              onTitle={(t) => onChangeBlocks(setSlideTitle(blocks, slide.id, t))}
              onColor={(c) => onChangeBlocks(setSlideColor(blocks, slide.id, c))}
              onUnmerge={() => onChangeBlocks(ungroupSlide(blocks, slide.id))}
              onCopy={() => copySlide(slide)}
            />

            {slide.blockIds.map((bid) => {
              const block = blockById.get(bid);
              if (!block) return null;
              const index = indexOf.get(bid) ?? 0;
              const isOpener = bid === slide.blockIds[0];
              const isSelected = activeSelected.has(bid);
              return (
                <div
                  key={bid}
                  className={clsx(
                    'group flex items-start gap-2 rounded-md pr-2 transition-colors',
                    isSelected ? 'bg-indigo-100/70 dark:bg-indigo-900/30' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  )}
                >
                  <div className="flex items-center gap-1 pt-2 pl-1 select-none">
                    <button
                      onClick={(e) => toggleSelect(bid, e.shiftKey)}
                      className={clsx(
                        'w-3.5 h-3.5 rounded-full border-2 transition-colors',
                        isSelected
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                      )}
                      title="Select line (shift-click for a range)"
                    />
                    {!isOpener && (
                      <button
                        onClick={() => onChangeBlocks(startSlideAt(blocks, bid))}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-all"
                        title="Start a new slide here"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <RichBlock
                    blockId={bid}
                    html={block.text}
                    placeholder={index === 0 && blocks.length === 1 ? 'Start writing…' : ''}
                    onInput={(html) => handleInput(bid, html)}
                    onKeyDown={(e) => handleKeyDown(e, bid)}
                    registerRef={registerEditor}
                    className="flex-1 py-2 leading-relaxed text-gray-800 dark:text-gray-200"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          const last = blocks[blocks.length - 1];
          const { blocks: next, newId } = insertBlockAfter(blocks, last.id);
          onChangeBlocks(next);
          pendingFocusRef.current = { id: newId, caret: 'start' };
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
  color,
  canUnmerge,
  onTitle,
  onColor,
  onUnmerge,
  onCopy,
}: {
  index: number;
  title: string;
  color: string;
  canUnmerge: boolean;
  onTitle: (t: string) => void;
  onColor: (c: string) => void;
  onUnmerge: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="group/header flex items-center gap-2 mb-1 pl-1">
      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 shrink-0">
        <ChevronRight className="w-3.5 h-3.5" />
        Slide {index + 1}
      </span>
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Slide headline…"
        className="flex-1 bg-transparent text-base font-semibold text-gray-900 dark:text-gray-100 outline-none border-b border-transparent focus:border-indigo-300 dark:focus:border-indigo-700 placeholder:text-gray-400 placeholder:font-normal"
      />
      <div className="opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center gap-1">
        <button
          onClick={onCopy}
          className="text-gray-300 hover:text-indigo-500 transition-colors"
          title="Copy this slide's text"
        >
          <Copy className="w-4 h-4" />
        </button>
        <SlideColorMenu value={color} onChange={onColor} />
        {canUnmerge && (
          <button
            onClick={onUnmerge}
            className="text-gray-300 hover:text-red-500 transition-colors"
            title="Remove this slide break (merge into the slide above)"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
