import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  computePlacementMetrics,
  computeRevenue,
  effectiveCohort,
  effectivePrice,
  effectiveChurn,
  effectiveRetention,
  membershipRevenueStream,
  CoursePlacement,
} from '@/types/scenarios';

interface Driver {
  label: string;
  detail: string;
  direction: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0..1 — relative importance for sorting
}

interface AnalysisPayload {
  scenarioName: string;
  totals: { revenue: number; cost: number; profit: number; ev: number; placements: number };
  drivers: Driver[];
  narrative: string;
  source: 'openai' | 'heuristic';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scenarioId: string | undefined = body.scenarioId;
    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId required' }, { status: 400 });
    }

    const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } });
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }
    const placements = (await prisma.coursePlacement.findMany({
      where: { scenarioId },
      include: { courseTemplate: true },
      orderBy: { startDate: 'asc' },
    })) as unknown as CoursePlacement[];

    const totals = aggregateTotals(placements);
    const drivers = computeDrivers(placements);

    const apiKey = process.env.OPENAI_API_KEY;
    let narrative = '';
    let source: 'openai' | 'heuristic' = 'heuristic';

    if (apiKey) {
      try {
        narrative = await generateNarrative(apiKey, scenario.name, totals, drivers, placements);
        source = 'openai';
      } catch (err) {
        console.error('OpenAI narrative failed, falling back to heuristic:', err);
        narrative = heuristicNarrative(scenario.name, totals, drivers);
      }
    } else {
      narrative = heuristicNarrative(scenario.name, totals, drivers);
    }

    const payload: AnalysisPayload = {
      scenarioName: scenario.name,
      totals,
      drivers,
      narrative,
      source,
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Scenario analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze scenario' }, { status: 500 });
  }
}

function aggregateTotals(placements: CoursePlacement[]) {
  let revenue = 0;
  let cost = 0;
  let profit = 0;
  let ev = 0;
  for (const p of placements) {
    const m = computePlacementMetrics(p);
    revenue += m.revenue;
    cost += m.cost;
    profit += m.profit;
    ev += m.expectedValue;
  }
  return { revenue, cost, profit, ev, placements: placements.length };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

// Deterministic driver detection. Each driver is labeled with direction and a
// rough magnitude (0..1) so the UI can sort/visualize. The LLM narrative reads
// these as ground truth instead of guessing from raw placement JSON.
function computeDrivers(placements: CoursePlacement[]): Driver[] {
  if (placements.length === 0) return [];

  const totalRevenue = placements.reduce((s, p) => s + computeRevenue(p), 0);
  const totalCost = placements.reduce((s, p) => s + p.costPerRun, 0);
  const drivers: Driver[] = [];

  // Per-placement contribution
  const ranked = placements
    .map((p) => ({
      placement: p,
      name: p.courseTemplate?.name ?? 'Course',
      revenue: computeRevenue(p),
      cost: p.costPerRun,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Top revenue contributor concentration
  if (ranked.length > 0 && totalRevenue > 0) {
    const top = ranked[0];
    const share = top.revenue / totalRevenue;
    if (share >= 0.4) {
      drivers.push({
        label: `${top.name} drives ${(share * 100).toFixed(0)}% of revenue`,
        detail: `${fmt(top.revenue)} of ${fmt(totalRevenue)} comes from a single placement — concentration risk if it underperforms.`,
        direction: share >= 0.7 ? 'negative' : 'neutral',
        magnitude: Math.min(1, share),
      });
    }
  }

  // Membership churn impact
  const memberships = placements.filter((p) => p.isMembership);
  for (const p of memberships) {
    const churn = effectiveChurn(p);
    const retention = effectiveRetention(p);
    const stream = membershipRevenueStream(p);
    const lifetimeRevenue = stream.reduce((s, r) => s + r.revenue, 0);
    const cohort = effectiveCohort(p);
    const price = effectivePrice(p);
    const idealRevenue = cohort * price * retention; // zero-churn ceiling
    const lossFromChurn = Math.max(0, idealRevenue - lifetimeRevenue);
    const name = p.courseTemplate?.name ?? 'Membership';

    if (churn >= 8) {
      drivers.push({
        label: `High churn on ${name} (${churn}%/period)`,
        detail: `Churn shaves roughly ${fmt(lossFromChurn)} off the ${retention}-period revenue ceiling of ${fmt(idealRevenue)}.`,
        direction: 'negative',
        magnitude: Math.min(1, lossFromChurn / Math.max(1, totalRevenue)),
      });
    } else if (churn > 0 && churn <= 3 && lifetimeRevenue > 0) {
      drivers.push({
        label: `Low churn on ${name} (${churn}%/period)`,
        detail: `Sticky cohort retains revenue across ${retention} periods — supports the lifetime value of ${fmt(lifetimeRevenue)}.`,
        direction: 'positive',
        magnitude: Math.min(1, lifetimeRevenue / Math.max(1, totalRevenue)),
      });
    }

    // Trial → paid conversion drag
    if (p.entryMode === 'trial-to-paid') {
      const conv = p.trialToPaidConversionPercent;
      if (conv < 50) {
        const lost = cohort * (1 - conv / 100);
        drivers.push({
          label: `${name} trial→paid is ${conv}%`,
          detail: `About ${Math.round(lost)} of ${Math.round(cohort)} trial users never convert. Lifting conversion is high-leverage.`,
          direction: 'negative',
          magnitude: Math.min(1, (1 - conv / 100) * 0.6),
        });
      } else if (conv >= 80) {
        drivers.push({
          label: `${name} trial→paid is ${conv}%`,
          detail: `Strong funnel — most trial users become paying members, compounding into the active cohort.`,
          direction: 'positive',
          magnitude: 0.4,
        });
      }
    }
  }

  // Likelihood drag — gap between profit and EV
  const profit = placements.reduce((s, p) => s + computePlacementMetrics(p).profit, 0);
  const ev = placements.reduce((s, p) => s + computePlacementMetrics(p).expectedValue, 0);
  if (profit > 0 && ev / profit < 0.7) {
    const dragPct = ((1 - ev / profit) * 100).toFixed(0);
    drivers.push({
      label: `Likelihood discount is dragging EV by ${dragPct}%`,
      detail: `Profit of ${fmt(profit)} translates to only ${fmt(ev)} of expected value — several placements have soft likelihoods.`,
      direction: 'negative',
      magnitude: Math.min(1, 1 - ev / Math.max(1, profit)),
    });
  }

  // Placements using template defaults — incomplete setup
  const usingDefaults = placements.filter(
    (p) => p.projectedRegistrations <= 0 || p.pricePerChild <= 0,
  );
  if (usingDefaults.length > 0) {
    drivers.push({
      label: `${usingDefaults.length} placement${usingDefaults.length === 1 ? '' : 's'} using template defaults`,
      detail: `Cohort/price falling back to course-template defaults — fill these in for a more accurate projection.`,
      direction: 'neutral',
      magnitude: 0.3,
    });
  }

  // Cost-heavy placements (cost > revenue at 100% likelihood)
  const upsideNegative = ranked.filter((r) => r.cost > r.revenue);
  if (upsideNegative.length > 0) {
    const totalLoss = upsideNegative.reduce((s, r) => s + (r.cost - r.revenue), 0);
    drivers.push({
      label: `${upsideNegative.length} placement${upsideNegative.length === 1 ? '' : 's'} unprofitable at full delivery`,
      detail: `${upsideNegative.map((r) => r.name).join(', ')} run at a loss before likelihood — combined gap ${fmt(totalLoss)}.`,
      direction: 'negative',
      magnitude: Math.min(1, totalLoss / Math.max(1, totalRevenue + totalCost)),
    });
  }

  // High-margin contributors (top profit per placement)
  const profitable = ranked
    .map((r) => ({ name: r.name, profit: r.revenue - r.cost }))
    .filter((r) => r.profit > 0)
    .sort((a, b) => b.profit - a.profit);
  if (profitable.length > 0) {
    const top = profitable[0];
    drivers.push({
      label: `${top.name} is the strongest profit contributor`,
      detail: `Contributes ${fmt(top.profit)} of profit — preserve its delivery and pricing.`,
      direction: 'positive',
      magnitude: Math.min(1, top.profit / Math.max(1, profit)),
    });
  }

  // Sort by magnitude; cap at 8 to keep the UI focused.
  return drivers.sort((a, b) => b.magnitude - a.magnitude).slice(0, 8);
}

async function generateNarrative(
  apiKey: string,
  scenarioName: string,
  totals: ReturnType<typeof aggregateTotals>,
  drivers: Driver[],
  placements: CoursePlacement[],
): Promise<string> {
  const placementSummary = placements.slice(0, 12).map((p) => {
    const m = computePlacementMetrics(p);
    return {
      course: p.courseTemplate?.name ?? 'Course',
      type: p.isMembership ? 'membership' : 'one-off',
      revenue: Math.round(m.revenue),
      cost: Math.round(m.cost),
      profit: Math.round(m.profit),
      likelihood: p.likelihoodPercent,
      cohort: effectiveCohort(p),
      price: effectivePrice(p),
      churn: p.isMembership ? effectiveChurn(p) : null,
    };
  });

  const systemPrompt = `You are a revenue analyst. Given a scenario and its pre-computed drivers,
write a short, plain-English explanation of WHY this scenario looks the way it does.

Rules:
- 3 to 5 short bullets, each one sentence.
- Lead with the single biggest factor (positive or negative).
- Quote specific numbers from the drivers/totals — never invent new ones.
- If revenue is low, name the cause. If it's high, name what's working.
- No fluff, no preamble, no headers — just the bullets.`;

  const userPrompt = `Scenario: ${scenarioName}
Totals: revenue=${fmt(totals.revenue)}, cost=${fmt(totals.cost)}, profit=${fmt(totals.profit)}, ev=${fmt(totals.ev)}, placements=${totals.placements}

Pre-computed drivers (ranked by importance):
${drivers.map((d, i) => `${i + 1}. [${d.direction}] ${d.label} — ${d.detail}`).join('\n')}

Per-placement summary (for context, do not list verbatim):
${JSON.stringify(placementSummary)}

Write the bullets now.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 400,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

function heuristicNarrative(
  scenarioName: string,
  totals: ReturnType<typeof aggregateTotals>,
  drivers: Driver[],
): string {
  if (drivers.length === 0) {
    return totals.placements === 0
      ? `No placements yet in "${scenarioName}". Add courses or memberships to project revenue.`
      : `"${scenarioName}" projects ${fmt(totals.revenue)} of revenue and ${fmt(totals.profit)} of profit. Add more variation in placements to surface stronger drivers.`;
  }
  const top = drivers.slice(0, 5);
  return top.map((d) => `- ${d.label}: ${d.detail}`).join('\n');
}
