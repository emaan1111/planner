'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowLeft, FileText, Presentation, Check, Loader2 } from 'lucide-react';
import { useDoc, useUpdateDoc } from '@/hooks/useDocsQuery';
import { Doc, DocBlock } from '@/types/docs';
import { ensureNotEmpty, getSlides } from '@/lib/docModel';
import { DocumentView } from '@/components/docs/DocumentView';
import { SlideView } from '@/components/docs/SlideView';
import { ToastContainer } from '@/components/ui/Toast';

type ViewMode = 'document' | 'slides';
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

export default function DocEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: doc, isLoading } = useDoc(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500">Document not found.</p>
        <Link href="/docs" className="text-indigo-500 hover:underline text-sm">Back to documents</Link>
      </div>
    );
  }

  // Remount the editor per document id so its local state seeds cleanly from
  // the loaded doc without a hydration effect.
  return <Editor key={doc.id} doc={doc} />;
}

function Editor({ doc }: { doc: Doc }) {
  const updateDoc = useUpdateDoc();

  const [title, setTitle] = useState(doc.title);
  const [blocks, setBlocks] = useState<DocBlock[]>(() => ensureNotEmpty(doc.blocks));
  const [view, setView] = useState<ViewMode>('document');
  const [slideLayout, setSlideLayout] = useState<'list' | 'grid'>('list');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const id = doc.id;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (next: { title?: string; blocks?: DocBlock[] }) => {
      setSaveState('dirty');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveState('saving');
        updateDoc.mutate(
          { id, updates: next },
          { onSuccess: () => setSaveState('saved'), onError: () => setSaveState('dirty') }
        );
      }, 700);
    },
    [id, updateDoc]
  );

  const handleBlocks = useCallback(
    (next: DocBlock[]) => {
      setBlocks(next);
      scheduleSave({ blocks: next });
    },
    [scheduleSave]
  );

  const handleTitle = (value: string) => {
    setTitle(value);
    scheduleSave({ title: value });
  };

  // Flush a pending save when leaving the page.
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const slideCount = useMemo(() => getSlides(blocks).length, [blocks]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/docs"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <input
            value={title}
            onChange={(e) => handleTitle(e.target.value)}
            placeholder="Untitled document"
            className="flex-1 min-w-0 bg-transparent text-lg font-semibold text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-300"
          />

          <SaveBadge state={saveState} />

          {/* View toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
            <button
              onClick={() => setView('document')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                view === 'document' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'
              )}
            >
              <FileText className="w-4 h-4" />
              Text
            </button>
            <button
              onClick={() => setView('slides')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                view === 'slides' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'
              )}
            >
              <Presentation className="w-4 h-4" />
              Slides
              <span className="text-xs text-gray-400">{slideCount}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {view === 'document' ? (
          <DocumentView blocks={blocks} onChangeBlocks={handleBlocks} />
        ) : (
          <SlideView blocks={blocks} onChangeBlocks={handleBlocks} layout={slideLayout} onLayoutChange={setSlideLayout} />
        )}
      </main>

      <ToastContainer />
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
      {state === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {state === 'saved' && <Check className="w-3.5 h-3.5 text-green-500" />}
      {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Unsaved'}
    </span>
  );
}
