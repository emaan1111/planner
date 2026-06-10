import { NextRequest, NextResponse } from 'next/server';
import { resolveTarget, YtDlpMissingError, type ChannelTab } from '@/lib/youtube';

// Uses yt-dlp (child_process) — must run on the Node runtime, never cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABS: ChannelTab[] = ['videos', 'streams', 'shorts'];

// POST { input, tab? } -> resolve a YouTube URL into a single video or a list of
// a channel's videos (for the picker). The list is "flat" (no per-video network
// calls) so even a big channel resolves quickly.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = typeof body.input === 'string' ? body.input.trim() : '';
    if (!input) {
      return NextResponse.json({ error: 'Enter a YouTube video or channel URL.' }, { status: 400 });
    }
    const tab: ChannelTab = TABS.includes(body.tab) ? body.tab : 'videos';

    const result = await resolveTarget(input, tab);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof YtDlpMissingError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : 'Failed to resolve URL';
    console.error('YouTube resolve error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
