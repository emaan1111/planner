import { v4 as uuidv4 } from 'uuid';
import { DocBlock, DocSlide } from '@/types/docs';

// ---------------------------------------------------------------------------
// Pure helpers for the document model. Every function is side-effect free and
// returns a new blocks array, so they're safe to drive React state and to unit
// test. The block at index 0 always opens the first slide whether or not it
// carries the `slideStart` flag.
// ---------------------------------------------------------------------------

export function newBlock(text = ''): DocBlock {
  return { id: uuidv4(), text };
}

// A brand-new document starts with a single empty paragraph.
export function emptyBlocks(): DocBlock[] {
  return [newBlock('')];
}

// Guarantee there's always at least one block to type into.
export function ensureNotEmpty(blocks: DocBlock[]): DocBlock[] {
  return blocks.length ? blocks : emptyBlocks();
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Group the flat blocks into slides. Index 0 always begins a slide.
export function getSlides(blocks: DocBlock[]): DocSlide[] {
  const slides: DocSlide[] = [];
  blocks.forEach((block, index) => {
    const opensSlide = index === 0 || block.slideStart;
    if (opensSlide) {
      slides.push({
        id: block.id,
        title: block.slideTitle ?? '',
        blockIds: [block.id],
        startIndex: index,
        endIndex: index,
      });
    } else {
      const current = slides[slides.length - 1];
      current.blockIds.push(block.id);
      current.endIndex = index;
    }
  });
  return slides;
}

export function updateBlockText(blocks: DocBlock[], id: string, text: string): DocBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, text } : b));
}

// Insert a fresh empty block after the given block (Enter key). Returns the new
// block's id so the caller can move focus to it.
export function insertBlockAfter(blocks: DocBlock[], id: string): { blocks: DocBlock[]; newId: string } {
  const index = blocks.findIndex((b) => b.id === id);
  const block = newBlock('');
  const next = blocks.slice();
  next.splice(index + 1, 0, block);
  return { blocks: next, newId: block.id };
}

// Remove a block. If it opened a slide and the slide has more blocks, the next
// block inherits the boundary (and title) so the slide survives. Never removes
// the final remaining block.
export function removeBlock(blocks: DocBlock[], id: string): DocBlock[] {
  if (blocks.length <= 1) return blocks;
  const index = blocks.findIndex((b) => b.id === id);
  if (index === -1) return blocks;
  const removed = blocks[index];
  const next = blocks.slice();
  next.splice(index, 1);

  const openedSlide = index === 0 || removed.slideStart;
  if (openedSlide && next[index] && !next[index].slideStart && index < next.length) {
    // Promote the following block to keep the slide boundary, but only if it
    // wasn't already the start of its own slide.
    const inheritor = next[index];
    next[index] = { ...inheritor, slideStart: index === 0 ? inheritor.slideStart : true, slideTitle: removed.slideTitle };
  }
  return ensureNotEmpty(next);
}

// Backspace at the start of a block: merge its text into the previous block and
// drop it. Merging across a slide boundary simply removes that boundary.
export function mergeWithPrevious(blocks: DocBlock[], id: string): { blocks: DocBlock[]; mergedIntoId: string | null; caret: number } {
  const index = blocks.findIndex((b) => b.id === id);
  if (index <= 0) return { blocks, mergedIntoId: null, caret: 0 };
  const prev = blocks[index - 1];
  const curr = blocks[index];
  const caret = prev.text.length;
  const next = blocks.slice();
  next[index - 1] = { ...prev, text: prev.text + curr.text };
  next.splice(index, 1);
  return { blocks: ensureNotEmpty(next), mergedIntoId: prev.id, caret };
}

// Turn a contiguous run of selected blocks into its own slide with `title`.
// `selectedIds` may be in any order; the run is validated against document order.
export function groupIntoSlide(blocks: DocBlock[], selectedIds: string[], title: string): DocBlock[] {
  const idSet = new Set(selectedIds);
  const indices = blocks
    .map((b, i) => (idSet.has(b.id) ? i : -1))
    .filter((i) => i >= 0);
  if (!indices.length) return blocks;
  const first = indices[0];
  const last = indices[indices.length - 1];

  return blocks.map((b, i) => {
    if (i === first) {
      // Open the new slide here with the given headline.
      return { ...b, slideStart: i === 0 ? b.slideStart : true, slideTitle: title };
    }
    if (i > first && i <= last) {
      // Interior blocks must not carry their own boundary.
      return { ...b, slideStart: false, slideTitle: undefined };
    }
    if (i === last + 1 && !b.slideStart) {
      // Close the selection by starting a fresh (untitled) slide right after it.
      return { ...b, slideStart: true, slideTitle: undefined };
    }
    return b;
  });
}

// Start a new slide at a single block (the "split here" action).
export function startSlideAt(blocks: DocBlock[], id: string, title = ''): DocBlock[] {
  return blocks.map((b, i) =>
    b.id === id ? { ...b, slideStart: i === 0 ? b.slideStart : true, slideTitle: title } : b
  );
}

// Merge a slide back into the slide before it (remove its opening boundary).
// The first slide can't be merged upward.
export function ungroupSlide(blocks: DocBlock[], slideStartId: string): DocBlock[] {
  const index = blocks.findIndex((b) => b.id === slideStartId);
  if (index <= 0) return blocks;
  return blocks.map((b) => (b.id === slideStartId ? { ...b, slideStart: false, slideTitle: undefined } : b));
}

export function setSlideTitle(blocks: DocBlock[], slideStartId: string, title: string): DocBlock[] {
  return blocks.map((b) => (b.id === slideStartId ? { ...b, slideTitle: title } : b));
}

// Move slide `from` to position `to` (slide indices). The slide's blocks travel
// with it. Boundaries are renormalised so the result is always well-formed.
export function reorderSlides(blocks: DocBlock[], from: number, to: number): DocBlock[] {
  const slides = getSlides(blocks);
  if (from < 0 || to < 0 || from >= slides.length || to >= slides.length || from === to) {
    return blocks;
  }
  const groups = slides.map((s) => blocks.slice(s.startIndex, s.endIndex + 1));
  const moved = arrayMove(groups, from, to);
  // Renormalise: the first block of every group opens its slide; nothing else does.
  return moved.flatMap((group, gi) =>
    group.map((block, bi) => {
      if (bi === 0) {
        return gi === 0
          ? { ...block, slideStart: false }
          : { ...block, slideStart: true };
      }
      return { ...block, slideStart: false, slideTitle: undefined };
    })
  );
}

// Replace the body of one slide from a newline-separated string (used by the
// slide view). Existing block ids are reused positionally so the caret and the
// slide's identity stay stable while editing; the opening block keeps its
// boundary and headline.
export function replaceSlideBody(blocks: DocBlock[], slideStartId: string, bodyText: string): DocBlock[] {
  const slides = getSlides(blocks);
  const slide = slides.find((s) => s.id === slideStartId);
  if (!slide) return blocks;

  const oldIds = slide.blockIds;
  const opener = blocks[slide.startIndex];
  const lines = bodyText.split('\n');
  if (lines.length === 0) lines.push('');

  const rebuilt: DocBlock[] = lines.map((text, i) => {
    const id = oldIds[i] ?? uuidv4();
    if (i === 0) {
      return { id, text, slideStart: opener.slideStart, slideTitle: opener.slideTitle };
    }
    return { id, text };
  });

  const next = blocks.slice();
  next.splice(slide.startIndex, slide.endIndex - slide.startIndex + 1, ...rebuilt);
  return next;
}

// Plain-text preview of a slide's body (everything after the headline).
export function slideBodyText(blocks: DocBlock[], slide: DocSlide): string {
  return slide.blockIds
    .map((id) => blocks.find((b) => b.id === id)?.text ?? '')
    .join('\n')
    .trim();
}
