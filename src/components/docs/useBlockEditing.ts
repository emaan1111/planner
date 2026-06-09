'use client';

import { useEffect, useMemo, useRef } from 'react';
import { DocBlock } from '@/types/docs';
import { updateBlockText, insertBlockAfter, mergeWithPrevious } from '@/lib/docModel';
import { caretAtStart, setCaret, normalizeHtml } from './richText';

type PendingFocus = { id: string; caret: number | 'start' | 'end' } | null;
export type FormatCommand = 'bold' | 'underline' | 'foreColor' | 'hiliteColor' | 'removeFormat';

// Shared editing behaviour for the contentEditable rich blocks: caret/focus
// management across structural changes, Enter to split, Backspace to merge, and
// applying inline formatting to whatever block is focused. Used by both the
// document view and the slide editors so they behave identically.
export function useBlockEditing(blocks: DocBlock[], onChangeBlocks: (blocks: DocBlock[]) => void) {
  const editors = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingFocus = useRef<PendingFocus>(null);
  const indexOf = useMemo(() => new Map(blocks.map((b, i) => [b.id, i])), [blocks]);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = editors.current.get(target.id);
    if (el) setCaret(el, target.caret);
  }, [blocks]);

  const registerEditor = (id: string, el: HTMLDivElement | null) => {
    if (el) editors.current.set(id, el);
    else editors.current.delete(id);
  };

  const handleInput = (id: string, html: string) => onChangeBlocks(updateBlockText(blocks, id, html));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const { blocks: next, newId } = insertBlockAfter(blocks, id);
      onChangeBlocks(next);
      pendingFocus.current = { id: newId, caret: 'start' };
    } else if (e.key === 'Backspace' && caretAtStart(e.currentTarget)) {
      const index = indexOf.get(id) ?? -1;
      if (index > 0) {
        e.preventDefault();
        const prevId = blocks[index - 1].id;
        const prevLen = editors.current.get(prevId)?.textContent?.length ?? 0;
        const { blocks: next, mergedIntoId } = mergeWithPrevious(blocks, id);
        onChangeBlocks(next);
        if (mergedIntoId) pendingFocus.current = { id: mergedIntoId, caret: prevLen };
      }
    }
  };

  const applyFormat = (cmd: FormatCommand, value?: string) => {
    const active = document.activeElement as HTMLElement | null;
    const id = active?.getAttribute('data-block-id') ?? undefined;
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      /* not supported — ignore */
    }
    document.execCommand(cmd, false, value);
    if (id) {
      const el = editors.current.get(id);
      if (el) onChangeBlocks(updateBlockText(blocks, id, normalizeHtml(el.innerHTML)));
    }
  };

  return { registerEditor, handleInput, handleKeyDown, applyFormat, pendingFocusRef: pendingFocus };
}
