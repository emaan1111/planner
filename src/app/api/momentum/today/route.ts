import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dayKeyInZone, isDayKey, safeTimeZone, selectTodayTasks } from '@/lib/momentum';

export const dynamic = 'force-dynamic';

// GET /api/momentum/today?date=yyyy-MM-dd&tz=Area/City
//
// Today's task list for the Momentum macOS app: open tasks that are overdue,
// due today, being worked on, or scheduled for today, plus tasks completed
// today (Momentum hides those but counts them toward its daily ring). `date`
// and `tz` come from the Mac so "today" is the user's local day; both are
// optional.
//
// Momentum writes through the regular task API (POST /api/tasks to add,
// PUT /api/tasks/:id to tick, rename or move, DELETE to remove), so there is
// no separate write route.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tz = safeTimeZone(searchParams.get('tz'));
    const dateParam = searchParams.get('date');
    const day = isDayKey(dateParam) ? dateParam : dayKeyInZone(new Date(), tz);

    // Done tasks only matter if they were finished today; a 3-day window covers
    // any time-zone offset between the server and the Mac.
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        archived: false,
        bucket: { not: 'someday' },
        OR: [{ status: { not: 'done' } }, { completedAt: { gte: since } }],
      },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(
      {
        date: day,
        tz,
        tasks: selectTodayTasks(tasks, day, tz),
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error building Momentum task list:', error);
    return NextResponse.json({ error: 'Failed to build today\'s task list' }, { status: 500 });
  }
}
