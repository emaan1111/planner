'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Minimal wrapper around the YouTube IFrame Player API. Exposes seekTo() so the
// transcript can drive the video (click a word -> seek), and reports the current
// playback time (polled) so the matching word can highlight as it plays.

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
}

interface Props {
  youtubeId: string;
  onTime?: (seconds: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

// Load the IFrame API exactly once, shared across all player instances.
let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as unknown as { YT?: { Player: unknown }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const YouTubePlayer = forwardRef<YouTubePlayerHandle, Props>(function YouTubePlayer(
  { youtubeId, onTime, onPlayingChange },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (s: number) => playerRef.current?.seekTo?.(s, true),
    play: () => playerRef.current?.playVideo?.(),
    pause: () => playerRef.current?.pauseVideo?.(),
  }));

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current) return;
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: youtubeId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e: any) => {
            const playing = e.data === YT.PlayerState.PLAYING;
            onPlayingChange?.(playing);
            if (playing) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime?.();
                if (typeof t === 'number') onTime?.(t);
              }, 250);
            } else if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  return (
    <div className="aspect-video bg-black">
      <div ref={hostRef} className="w-full h-full" />
    </div>
  );
});
