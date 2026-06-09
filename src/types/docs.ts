// A document is an ordered list of blocks (paragraphs). Slide boundaries and
// slide headlines live on the blocks themselves: a block with `slideStart` (and
// the very first block) begins a new slide, and everything until the next
// slideStart belongs to that slide. This keeps the document text and the slides
// as a single source of truth — reordering slides physically moves their blocks.
export interface DocBlock {
  id: string;
  text: string;         // inline HTML (bold/underline/colour/highlight); plain text is valid HTML
  slideStart?: boolean; // true when this block opens a new slide
  slideTitle?: string;  // headline for the slide this block opens (only meaningful when it opens one)
  slideColor?: string;  // whole-slide background tint (CSS colour) set on the opening block; '' or undefined = none
}

export interface Doc {
  id: string;
  title: string;
  blocks: DocBlock[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// A derived view over the blocks: one entry per slide.
export interface DocSlide {
  id: string;          // id of the block that opens the slide
  title: string;       // headline (may be empty)
  color: string;       // whole-slide background tint ('' = none)
  blockIds: string[];  // ids of every block in the slide, in order
  startIndex: number;  // index in the flat blocks array of the first block
  endIndex: number;    // index of the last block (inclusive)
}
