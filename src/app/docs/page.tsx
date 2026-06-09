'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, FileText, Trash2, Presentation } from 'lucide-react';
import clsx from 'clsx';
import { useDocs, useCreateDoc, useDeleteDoc } from '@/hooks/useDocsQuery';
import { emptyBlocks, getSlides } from '@/lib/docModel';
import { ToastContainer } from '@/components/ui/Toast';

export default function DocsListPage() {
  const router = useRouter();
  const { data: docs = [], isLoading } = useDocs();
  const createDoc = useCreateDoc();
  const deleteDoc = useDeleteDoc();

  const handleCreate = async () => {
    const doc = await createDoc.mutateAsync({ title: 'Untitled document', blocks: emptyBlocks() });
    router.push(`/docs/${doc.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Documents</h1>
              <span className="text-sm text-gray-400">{docs.length}</span>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={createDoc.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            New document
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No documents yet.</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => {
              const slideCount = getSlides(doc.blocks).length;
              const wordCount = doc.blocks.reduce((n, b) => n + (b.text.trim() ? b.text.trim().split(/\s+/).length : 0), 0);
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative"
                >
                  <Link
                    href={`/docs/${doc.id}`}
                    className={clsx(
                      'block h-full p-4 rounded-xl border bg-white dark:bg-gray-900',
                      'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700',
                      'hover:shadow-md transition-all'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Presentation className="w-3.5 h-3.5" />
                        {slideCount} slide{slideCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <h2 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                      {doc.title || 'Untitled document'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {wordCount} word{wordCount === 1 ? '' : 's'} · {doc.updatedAt.toLocaleDateString()}
                    </p>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${doc.title || 'Untitled document'}"?`)) deleteDoc.mutate(doc.id);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <ToastContainer />
    </div>
  );
}
