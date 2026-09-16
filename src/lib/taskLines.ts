// Turn free text into task titles: one task per non-empty line.
// Leading list markers (bullets, numbering, checkboxes) are stripped so a list
// pasted from notes / markdown / Notion reads as clean titles.

const LIST_MARKER = /^(?:[-*•–—>]+(?:\s+|$)|\d+[.)](?:\s+|$)|\(\d+\)(?:\s+|$)|\[[ xX]\]\s*|[☐☑✓✔]\s*)+/;

export function cleanTaskLine(line: string): string {
  return line.trim().replace(LIST_MARKER, '').trim();
}

export function parseTaskLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(cleanTaskLine)
    .filter((line) => line.length > 0);
}

// True when the text would produce more than one task.
export function hasMultipleLines(text: string): boolean {
  return parseTaskLines(text).length > 1;
}
