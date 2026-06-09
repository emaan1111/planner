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

interface Props {
  blocks: DocBlock[];
  onChangeBlocks: (blocks: DocBlock[]) => void;
  layout: 'list' | 'grid';
  onLayoutChange: (layout: 'list' | 'grid') => void;
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
        <p className="text-sm text-gray-400">Drag the handle to reorder slides — the document text moves with them.</p>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
          <button
            onClick={() => onLayoutChange('list')}
            className={clsx('p-1.5 rounded-md transition-colors', layout === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400')}
            title="List"
          >
            <Rows3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onLayoutChange('grid')}
            className={clsx('p-1.5 rounded-md transition-colors', layout === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400')}
            title="Grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slides.map((s) => s.id)} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
          <div className={clsx(layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3')}>
            {slides.map((slide, index) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={index}
                body={bodyOf(slide)}
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

function SlideCard({
  slide,
  index,
  body,
  canDelete,
  onTitle,
  onBody,
  onUnmerge,
}: {
  slide: DocSlide;
  index: number;
  body: string;
  canDelete: boolean;
  onTitle: (t: string) => void;
  onBody: (t: string) => void;
  onUnmerge: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
          {...attributes}
          {...listeners}
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
