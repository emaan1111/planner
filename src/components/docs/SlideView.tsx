'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, LayoutGrid, Rows3, Minus, Plus, Type, AlignLeft, Maximize2, PlusSquare, Copy, X } from 'lucide-react';
import clsx from 'clsx';
import { DocBlock, DocSlide } from '@/types/docs';
import { getSlides, reorderSlides, setSlideTitle, setSlideColor, ungroupSlide, insertSlideAfter } from '@/lib/docModel';
import { SlideColorMenu, FormatToolbar } from './DocFormatting';
import { SlideModal } from './SlideModal';
import { RichBlock } from './RichBlock';
import { useBlockEditing } from './useBlockEditing';
import { htmlToPlainText, copyText } from './richText';
import { toast } from '@/components/ui/Toast';

type SlideLayout = 'list' | 'grid';

const MIN_COLS = 1;
const MAX_COLS = 8;

// Editing handlers shared with the slide bodies and the modal.
export interface SlideEditing {
  registerEditor: (id: string, el: HTMLDivElement | null) => void;
  handleInput: (id: string, html: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, id: string) => void;
}

interface Props {
  blocks: DocBlock[];
  onChangeBlocks: (blocks: DocBlock[]) => void;
  layout: SlideLayout;
  onLayoutChange: (layout: SlideLayout) => void;
  cols: number;
  onColsChange: (cols: number) => void;
  showBody: boolean;
  onShowBodyChange: (show: boolean) => void;
}

export function SlideView({ blocks, onChangeBlocks, layout, onLayoutChange, cols, onColsChange, showBody, onShowBodyChange }: Props) {
  const slides = useMemo(() => getSlides(blocks), [blocks]);
  const blockById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [maximized, setMaximized] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);

  const { registerEditor, handleInput, handleKeyDown, applyFormat } = useBlockEditing(blocks, onChangeBlocks);
  const editing: SlideEditing = { registerEditor, handleInput, handleKeyDown };

  // Only keep selected ids that still exist.
  const liveIds = useMemo(() => new Set(slides.map((s) => s.id)), [slides]);
  const activeSelected = useMemo(() => new Set([...selected].filter((id) => liveIds.has(id))), [selected, liveIds]);

  const toggleSelect = (slideId: string, withShift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (withShift && anchor) {
        const ids = slides.map((s) => s.id);
        const a = ids.indexOf(anchor);
        const b = ids.indexOf(slideId);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(ids[i]);
          return next;
        }
      }
      if (next.has(slideId)) next.delete(slideId);
      else next.add(slideId);
      return next;
    });
    setAnchor(slideId);
  };

  const slideToText = (slide: DocSlide) => {
    const body = slide.blockIds.map((id) => htmlToPlainText(blockById.get(id)?.text ?? '')).join('\n');
    return slide.title ? `${slide.title}\n${body}` : body;
  };

  const copySelectedSlides = async () => {
    const chosen = slides.filter((s) => activeSelected.has(s.id)); // keep document order
    const text = chosen.map(slideToText).join('\n\n').trim();
    if (await copyText(text)) toast.success(`Copied ${chosen.length} slide${chosen.length === 1 ? '' : 's'}`);
    else toast.error('Copy failed');
  };

  const selectAll = () => setSelected(new Set(slides.map((s) => s.id)));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s.id === active.id);
    const to = slides.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    onChangeBlocks(reorderSlides(blocks, from, to));
  };

  const clampedCols = Math.min(MAX_COLS, Math.max(MIN_COLS, cols));
  const zoomIn = () => onColsChange(Math.max(MIN_COLS, clampedCols - 1));
  const zoomOut = () => onColsChange(Math.min(MAX_COLS, clampedCols + 1));

  return (
    <div>
      <FormatToolbar onCommand={applyFormat} />

      {/* Multi-slide selection actions */}
      {activeSelected.size > 0 && (
        <div className="sticky top-2 z-20 flex justify-center mb-3 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900 text-white shadow-lg text-sm">
            <span>{activeSelected.size} slide{activeSelected.size === 1 ? '' : 's'} selected</span>
            <button onClick={copySelectedSlides} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500 hover:bg-indigo-400 transition-colors">
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
            <button onClick={selectAll} className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              Select all
            </button>
            <button onClick={() => { setSelected(new Set()); setAnchor(null); }} className="p-1 rounded-full hover:bg-white/10" title="Clear selection">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-400 hidden md:block">
          {layout === 'grid' ? `${clampedCols} per row — drag to reorder, zoom below.` : 'Drag to reorder. Click any text to edit it.'}
        </p>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <button
              onClick={() => onShowBodyChange(false)}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors', !showBody ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-400')}
              title="Show headline only"
            >
              <Type className="w-4 h-4" />
              Title
            </button>
            <button
              onClick={() => onShowBodyChange(true)}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors', showBody ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-400')}
              title="Show headline and text"
            >
              <AlignLeft className="w-4 h-4" />
              + Text
            </button>
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <button
              onClick={() => onLayoutChange('list')}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors', layout === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-400')}
              title="List style"
            >
              <Rows3 className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => onLayoutChange('grid')}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors', layout === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-400')}
              title="Grid style"
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </button>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slides.map((s) => s.id)} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
          <div
            className={clsx(layout === 'grid' ? 'grid gap-4' : 'space-y-3')}
            style={layout === 'grid' ? { gridTemplateColumns: `repeat(${clampedCols}, minmax(0, 1fr))` } : undefined}
          >
            {slides.map((slide, index) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={index}
                blockById={blockById}
                editing={editing}
                layout={layout}
                showBody={showBody}
                canDelete={index !== 0}
                selected={activeSelected.has(slide.id)}
                onToggleSelect={(shift) => toggleSelect(slide.id, shift)}
                onTitle={(t) => onChangeBlocks(setSlideTitle(blocks, slide.id, t))}
                onColor={(c) => onChangeBlocks(setSlideColor(blocks, slide.id, c))}
                onUnmerge={() => onChangeBlocks(ungroupSlide(blocks, slide.id))}
                onInsertAfter={() => onChangeBlocks(insertSlideAfter(blocks, slide.id).blocks)}
                onMaximize={() => setMaximized(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => {
          const last = slides[slides.length - 1];
          if (last) onChangeBlocks(insertSlideAfter(blocks, last.id).blocks);
        }}
        className="mt-4 flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add slide
      </button>

      {layout === 'grid' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <button
            onClick={zoomOut}
            disabled={clampedCols >= MAX_COLS}
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Zoom out (more slides per row)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-14 text-center tabular-nums select-none">
            {clampedCols} / row
          </span>
          <button
            onClick={zoomIn}
            disabled={clampedCols <= MIN_COLS}
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Zoom in (fewer slides per row)"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      <SlideModal
        slides={slides}
        blockById={blockById}
        editing={editing}
        onCommand={applyFormat}
        index={maximized}
        onIndex={setMaximized}
        onClose={() => setMaximized(null)}
        onTitle={(slideId, t) => onChangeBlocks(setSlideTitle(blocks, slideId, t))}
      />
    </div>
  );
}

interface CardProps {
  slide: DocSlide;
  index: number;
  blockById: Map<string, DocBlock>;
  editing: SlideEditing;
  layout: SlideLayout;
  showBody: boolean;
  canDelete: boolean;
  selected: boolean;
  onToggleSelect: (shift: boolean) => void;
  onTitle: (t: string) => void;
  onColor: (c: string) => void;
  onUnmerge: () => void;
  onInsertAfter: () => void;
  onMaximize: () => void;
}

function SlideCard(props: CardProps) {
  const { slide, layout } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const dragHandle = { attributes, listeners };

  return layout === 'grid' ? (
    <GridSlide {...props} setNodeRef={setNodeRef} style={style} isDragging={isDragging} dragHandle={dragHandle} />
  ) : (
    <ListSlide {...props} setNodeRef={setNodeRef} style={style} isDragging={isDragging} dragHandle={dragHandle} />
  );
}

type SortableState = ReturnType<typeof useSortable>;
type InnerProps = CardProps & {
  setNodeRef: SortableState['setNodeRef'];
  style: React.CSSProperties;
  isDragging: boolean;
  dragHandle: Pick<SortableState, 'attributes' | 'listeners'>;
};

// Round checkbox used to select a slide for bulk actions (e.g. copy).
function SelectDot({ selected, onToggle }: { selected: boolean; onToggle: (shift: boolean) => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(e.shiftKey); }}
      className={clsx(
        'w-4 h-4 rounded-full border-2 shrink-0 transition-colors',
        selected
          ? 'bg-indigo-500 border-indigo-500'
          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 opacity-60 group-hover:opacity-100'
      )}
      title="Select slide (shift-click for a range)"
    />
  );
}

// Editable formatted body: every block in the slide as a rich paragraph.
function SlideBody({ slide, blockById, editing, small }: { slide: DocSlide; blockById: Map<string, DocBlock>; editing: SlideEditing; small?: boolean }) {
  return (
    <div className={clsx(small ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed', 'text-gray-600 dark:text-gray-400')}>
      {slide.blockIds.map((id, i) => {
        const block = blockById.get(id);
        if (!block) return null;
        return (
          <RichBlock
            key={id}
            blockId={id}
            html={block.text}
            placeholder={i === 0 ? 'Add text…' : ''}
            onInput={(html) => editing.handleInput(id, html)}
            onKeyDown={(e) => editing.handleKeyDown(e, id)}
            registerRef={editing.registerEditor}
            className="py-0.5"
          />
        );
      })}
    </div>
  );
}

function ListSlide({ slide, index, blockById, editing, showBody, canDelete, selected, onToggleSelect, onTitle, onColor, onUnmerge, onInsertAfter, onMaximize, setNodeRef, style, isDragging, dragHandle }: InnerProps) {
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...(slide.color ? { backgroundColor: slide.color } : {}) }}
      className={clsx(
        'group rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm',
        isDragging && 'opacity-50',
        selected && 'ring-2 ring-indigo-400'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-black/5 dark:border-white/5">
        <button {...dragHandle.attributes} {...dragHandle.listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none" title="Drag to reorder">
          <GripVertical className="w-4 h-4" />
        </button>
        <SelectDot selected={selected} onToggle={onToggleSelect} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500 shrink-0">Slide {index + 1}</span>
        <input
          value={slide.title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Slide headline…"
          className="flex-1 bg-transparent font-semibold text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400 placeholder:font-normal"
        />
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button onClick={onMaximize} className="text-gray-400 hover:text-indigo-500 transition-colors" title="Open full slide">
            <Maximize2 className="w-4 h-4" />
          </button>
          <SlideColorMenu value={slide.color} onChange={onColor} />
          <button onClick={onInsertAfter} className="text-gray-400 hover:text-indigo-500 transition-colors" title="Add a slide after this one">
            <PlusSquare className="w-4 h-4" />
          </button>
          {canDelete && (
            <button onClick={onUnmerge} className="text-gray-400 hover:text-red-500 transition-colors" title="Merge into the previous slide">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {showBody && (
        <div className="px-3 py-2">
          <SlideBody slide={slide} blockById={blockById} editing={editing} />
        </div>
      )}
    </div>
  );
}

function GridSlide({ slide, index, blockById, editing, showBody, canDelete, selected, onToggleSelect, onTitle, onColor, onUnmerge, onInsertAfter, onMaximize, setNodeRef, style, isDragging, dragHandle }: InnerProps) {
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...(slide.color ? { backgroundColor: slide.color } : {}) }}
      className={clsx(
        'group relative aspect-video flex flex-col rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden',
        isDragging ? 'opacity-50' : 'hover:shadow-md transition-shadow',
        selected && 'ring-2 ring-indigo-400'
      )}
    >
      <div className="flex items-center gap-1.5 px-2.5 pt-2">
        <button {...dragHandle.attributes} {...dragHandle.listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none" title="Drag to reorder">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <SelectDot selected={selected} onToggle={onToggleSelect} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{index + 1}</span>
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          <button onClick={onMaximize} className="text-gray-400 hover:text-indigo-500 transition-colors" title="Open full slide">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <SlideColorMenu value={slide.color} onChange={onColor} compact />
          <button onClick={onInsertAfter} className="text-gray-400 hover:text-indigo-500 transition-colors" title="Add a slide after this one">
            <PlusSquare className="w-3.5 h-3.5" />
          </button>
          {canDelete && (
            <button onClick={onUnmerge} className="text-gray-400 hover:text-red-500 transition-colors" title="Merge into the previous slide">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-3 pb-3 pt-1 min-h-0">
        <input
          value={slide.title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Headline…"
          className="w-full bg-transparent font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg leading-tight outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 shrink-0"
        />
        {showBody && (
          <div className="flex-1 mt-1.5 overflow-auto min-h-0">
            <SlideBody slide={slide} blockById={blockById} editing={editing} small />
          </div>
        )}
      </div>
    </div>
  );
}
