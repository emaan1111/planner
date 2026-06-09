'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { normalizeHtml } from './richText';

interface Props {
  blockId: string;
  html: string;
  placeholder?: string;
  className?: string;
  onInput: (html: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
}

// A single editable paragraph backed by contentEditable so it can hold inline
// formatting (bold/underline/colour/highlight). The block id is mirrored onto a
// data attribute so the formatting toolbar can find the active block.
export function RichBlock({ blockId, html, placeholder, className, onInput, onKeyDown, registerRef }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Push external HTML into the DOM only when it actually differs, so typing
  // (which updates state from the DOM) never resets the caret.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }, [html]);

  return (
    <div
      ref={(el) => {
        ref.current = el;
        registerRef(blockId, el);
        if (el && el.innerHTML !== html) el.innerHTML = html;
      }}
      data-block-id={blockId}
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      onInput={(e) => onInput(normalizeHtml(e.currentTarget.innerHTML))}
      onKeyDown={onKeyDown}
      className={clsx('doc-rich-block', className)}
    />
  );
}
