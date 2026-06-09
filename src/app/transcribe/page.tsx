'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Film, Trash2, Loader2, Clock } from 'lucide-react';
import clsx from 'clsx';
import {
  useVideoProjects,
  useCreateVideoProject,
  useDeleteVideoProject,
} from '@/hooks/useVideoProjectsQuery';
import { saveVideoBlob, deleteVideoBlob } from '@/lib/videoBlobStore';
import { ToastContainer, toast } from '@/components/ui/Toast';
import { VideoProject } from '@/types/video';

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    video.src = url;
  });
}

function formatDuration(sec: number): string {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  transcribing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function TranscribeListPage() {
  const router = useRouter();
  const { data: projects = [], isLoading } = useVideoProjects();
  const createProject = useCreateVideoProject();
  const deleteProject = useDeleteVideoProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please choose a video file.');
      return;
    }
    setUploading(true);
    try {
      const durationSec = await readVideoDuration(file);
      const project = await createProject.mutateAsync({
        title: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        durationSec,
      });
      await saveVideoBlob(project.id, file);
      router.push(`/transcribe/${project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  const handleDelete = async (project: VideoProject, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${project.title}"? This removes the transcript and the local video.`)) return;
    await deleteProject.mutateAsync(project.id);
    await deleteVideoBlob(project.id).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-rose-500" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Video Studio</h1>
              <span className="text-sm text-gray-400">{projects.length}</span>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload video'}
          </button>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Upload a video to transcribe it on-device, then edit the video by editing its transcript —
          delete words to cut them, and export a trimmed MP4. Nothing is uploaded to a server.
        </p>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : projects.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-center py-20 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl hover:border-rose-400 dark:hover:border-rose-600 transition-colors"
          >
            <Film className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-1">No videos yet.</p>
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">Upload a video to get started</p>
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative"
              >
                <Link
                  href={`/transcribe/${project.id}`}
                  className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Film className="w-8 h-8 text-rose-500 shrink-0" />
                    <span
                      className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded-full capitalize',
                        statusStyles[project.status] ?? statusStyles.draft
                      )}
                    >
                      {project.status}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatDuration(project.durationSec)}
                    {project.words.length > 0 && <span>· {project.words.length} words</span>}
                  </div>
                </Link>
                <button
                  onClick={(e) => handleDelete(project, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <ToastContainer />
    </div>
  );
}
