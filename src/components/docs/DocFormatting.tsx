'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Bold, Underline, Strikethrough, Baseline, Highlighter, Paintbrush, ChevronDown, Check, Copy } from 'lucide-react';
import { TEXT_COLORS, HIGHLIGHT_COLORS, SLIDE_COLORS, Swatch } from './richText';

// ---------------------------------------------------------------------------
// Inline formatting toolbar. Buttons preventDefault on mousedown so the editor
// keeps its text selection while a command is applied.
// ---------------------------------------------------------------------------

interface FormatToolbarProps {
  onCommand: (cmd: 'bold' | 'underline' | 'strikeThrough' | 'foreColor' | 'hiliteColor' | 'removeFormat', value?: string) => void;
  variant?: 'sticky' | 'bar' | 'inline';
  onCopyAll?: () => void;
}

export function FormatToolbar({ onCommand, variant = 'sticky', onCopyAll }: FormatToolbarProps) {
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      className={clsx(
        'flex items-center gap-1',
        variant === 'sticky' && 'sticky top-[57px] z-20 -mx-4 px-4 py-1.5 mb-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800',
        variant === 'bar' && 'mb-3 px-1 py-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800',
        variant === 'inline' && ''
      )}
    >
      <ToolbarButton label="Bold" onMouseDown={keep} onClick={() => onCommand('bold')}>
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton label="Underline" onMouseDown={keep} onClick={() => onCommand('underline')}>
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton label="Strikethrough" onMouseDown={keep} onClick={() => onCommand('strikeThrough')}>
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      <SwatchMenu
        label="Text colour"
        icon={<Baseline className="w-4 h-4" />}
        swatches={TEXT_COLORS}
        onPick={(s) => onCommand(s.value ? 'foreColor' : 'removeFormat', s.value || undefined)}
        keepSelection
      />
      <SwatchMenu
        label="Highlight"
        icon={<Highlighter className="w-4 h-4" />}
        swatches={HIGHLIGHT_COLORS}
        onPick={(s) => onCommand('hiliteColor', s.value || 'transparent')}
        keepSelection
      />

      <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      <ToolbarButton label="Clear formatting" onMouseDown={keep} onClick={() => onCommand('removeFormat')}>
        <span className="text-xs font-medium px-1">Clear</span>
      </ToolbarButton>

      {onCopyAll && (
        <>
          <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
          <ToolbarButton label="Copy all text" onClick={onCopyAll}>
            <Copy className="w-4 h-4" />
            <span className="text-xs font-medium px-1">Copy all</span>
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  children,
  onClick,
  onMouseDown,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={onMouseDown}
      onClick={onClick}
      className="inline-flex items-center p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Swatch dropdown used both in the toolbar (inline colours) and for whole-slide
// tints. `keepSelection` preserves the editor's text selection when picking.
// ---------------------------------------------------------------------------

interface SwatchMenuProps {
  label: string;
  icon: React.ReactNode;
  swatches: Swatch[];
  value?: string;
  onPick: (s: Swatch) => void;
  keepSelection?: boolean;
  buttonClassName?: string;
}

export function SwatchMenu({ label, icon, swatches, value, onPick, keepSelection, buttonClassName }: SwatchMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        onMouseDown={keepSelection ? (e) => e.preventDefault() : undefined}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex items-center gap-0.5 p-1.5 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
          buttonClassName
        )}
      >
        {icon}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-30 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
          onMouseDown={keepSelection ? (e) => e.preventDefault() : undefined}
        >
          <div className="grid grid-cols-4 gap-1.5 w-40">
            {swatches.map((s) => (
              <button
                key={s.label}
                type="button"
                title={s.label}
                onClick={() => {
                  onPick(s);
                  setOpen(false);
                }}
                className={clsx(
                  'relative w-8 h-8 rounded-md border border-gray-200 dark:border-gray-600 flex items-center justify-center',
                  !s.value && 'bg-white dark:bg-gray-700'
                )}
                style={s.value ? { backgroundColor: s.value } : undefined}
              >
                {!s.value && <span className="text-[10px] text-gray-400">∅</span>}
                {value !== undefined && (value || '') === s.value && (
                  <Check className="w-3.5 h-3.5 text-gray-700 dark:text-gray-100 absolute" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Convenience wrapper for the whole-slide tint picker.
export function SlideColorMenu({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <SwatchMenu
      label="Slide colour"
      icon={<Paintbrush className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      swatches={SLIDE_COLORS}
      value={value}
      onPick={(s) => onChange(s.value)}
    />
  );
}
