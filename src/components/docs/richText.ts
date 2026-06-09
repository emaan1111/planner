// Shared colour palettes and small DOM helpers for the rich-text editor.

export interface Swatch {
  label: string;
  value: string; // CSS colour; '' means "none / reset"
}

// Foreground text colours.
export const TEXT_COLORS: Swatch[] = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Pink', value: '#db2777' },
];

// Inline highlight (text background) colours.
export const HIGHLIGHT_COLORS: Swatch[] = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Purple', value: '#e9d5ff' },
];

// Whole-slide background tints (lighter than inline highlights).
export const SLIDE_COLORS: Swatch[] = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef9c3' },
  { label: 'Green', value: '#dcfce7' },
  { label: 'Blue', value: '#dbeafe' },
  { label: 'Pink', value: '#fce7f3' },
  { label: 'Purple', value: '#f3e8ff' },
  { label: 'Orange', value: '#ffedd5' },
  { label: 'Gray', value: '#f3f4f6' },
];

// Strip inline HTML to plain text (for copying to the clipboard).
export function htmlToPlainText(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? '';
}

// Copy plain text to the clipboard, with a best-effort fallback for older APIs.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Browsers leave a lone <br> behind in an emptied contentEditable; treat it as
// empty so placeholders show and persisted HTML stays clean.
export function normalizeHtml(html: string): string {
  const trimmed = html.trim();
  if (trimmed === '<br>' || trimmed === '<br/>' || trimmed === '<div><br></div>') return '';
  return html;
}

// Is the caret collapsed at the very start of this editable element?
export function caretAtStart(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const probe = range.cloneRange();
  probe.selectNodeContents(el);
  probe.setEnd(range.endContainer, range.endOffset);
  return probe.toString().length === 0;
}

// Place the caret inside an editable at a plain-text offset (or its start/end).
export function setCaret(el: HTMLElement, offset: number | 'start' | 'end') {
  el.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();

  if (offset === 'start') {
    range.selectNodeContents(el);
    range.collapse(true);
  } else if (offset === 'end') {
    range.selectNodeContents(el);
    range.collapse(false);
  } else {
    // Walk text nodes accumulating length until we reach the target offset.
    let remaining = offset;
    let placed = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) {
        range.setStart(node, remaining);
        range.collapse(true);
        placed = true;
        break;
      }
      remaining -= len;
      node = walker.nextNode();
    }
    if (!placed) {
      range.selectNodeContents(el);
      range.collapse(false);
    }
  }

  sel.removeAllRanges();
  sel.addRange(range);
}
