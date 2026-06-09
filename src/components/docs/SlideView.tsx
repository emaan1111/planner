'use client';

import { useMemo } from 'react';
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
import { GripVertical, Trash2, LayoutGrid, Rows3 } from 'lucide-react';
import clsx from 'clsx';
import { DocBlock, DocSlide } from '@/types/docs';
import { getSlides, reorderSlides, setSlideTitle, replaceSlideBody, ungroupSlide } from '@/lib/docModel';
import { AutoGrowTextarea } from './AutoGrowTextarea';

type SlideLayout = 'list' | 'grid';

interface Props {
  blocks: DocBlock[];
  onChangeBlocks: (blocks: DocBlock[]) => void;
  layout: SlideLayout;
  onLayoutChange: (layout: SlideLayout) => void;
}

export function SlideView({ blocks, onChangeBlocks, layout, onLayoutChange }: Props) {
  const slides = useMemo(() => getSlides(blocks), [blocks]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s.id === active.id);
    const to = slides.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    onChangeBlocks(reorderSlides(blocks, from, to));
  };

  const bodyOf = (slide: DocSlide) =>
    slide.blockIds.map((id) => blocks.find((b) => b.id === id)?.text ?? '').join('\n');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">Drag to reorder slides — the document text moves with them.</p>
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slides.map((s) => s.id)} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
          <div className={clsx(layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3')}>
            {slides.map((slide, index) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={index}
                body={bodyOf(slide)}
                layout={layout}
                canDelete={index !== 0}
                onTitle={(t) => onChangeBlocks(setSlideTitle(blocks, slide.id, t))}
                onBody={(t) => onChangeBlocks(replaceSlideBody(blocks, slide.id, t))}
                onUnmerge={() => onChangeBlocks(ungroupSlide(blocks, slide.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface CardProps {
  slide: DocSlide;
  index: number;
  body: string;
  layout: SlideLayout;
  canDelete: boolean;
  onTitle: (t: string) => void;
  onBody: (t: string) => void;
  onUnmerge: () => void;
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

// "List" style — full-width editable card, content auto-grows. (The original look.)
function ListSlide({ slide, index, body, canDelete, onTitle, onBody, onUnmerge, setNodeRef, style, isDragging, dragHandle }: InnerProps) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm',
        isDragging && 'opacity-50 ring-2 ring-indigo-400'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <button
          {...dragHandle.attributes}
          {...dragHandle.listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500 shrink-0">
          Slide {index + 1}
        </span>
        <input
          value={slide.title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Slide headline…"
          className="flex-1 bg-transparent font-semibold text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:font-normal"
        />
        {canDelete && (
          <button
            onClick={onUnmerge}
            className="text-gray-300 hover:text-red-500 transition-colors"
            title="Merge into the previous slide"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="px-3 py-2">
        <AutoGrowTextarea
          value={body}
          onChange={(e) => onBody(e.target.value)}
          placeholder="Slide content…"
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-gray-700 dark:text-gray-300 outline-none placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

// "Grid" style — a 16:9 slide thumbnail, like a presentation sorter view.
function GridSlide({ slide, index, body, canDelete, onTitle, onBody, onUnmerge, setNodeRef, style, isDragging, dragHandle }: InnerProps) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative aspect-video flex flex-col rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden',
        isDragging ? 'opacity-50 ring-2 ring-indigo-400' : 'hover:shadow-md transition-shadow'
      )}
    >
      {/* Top bar: slide number + drag handle + delete (appears on hover) */}
      <div className="flex items-center gap-1.5 px-2.5 pt-2">
        <button
          {...dragHandle.attributes}
          {...dragHandle.listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">
          {index + 1}
        </span>
        <div className="ml-auto">
          {canDelete && (
            <button
              onClick={onUnmerge}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
              title="Merge into the previous slide"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Slide surface: big headline, body fills the rest */}
      <div className="flex-1 flex flex-col px-3 pb-3 pt-1 min-h-0">
        <input
          value={slide.title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Headline…"
          className="w-full bg-transparent font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg leading-tight outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 shrink-0"
        />
        <textarea
          value={body}
          onChange={(e) => onBody(e.target.value)}
          placeholder="Slide content…"
          className="flex-1 mt-1.5 w-full resize-none bg-transparent text-xs leading-relaxed text-gray-600 dark:text-gray-400 outline-none placeholder:text-gray-400 overflow-auto min-h-0"
        />
      </div>
    </div>
  );
}
