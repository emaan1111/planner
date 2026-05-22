import { CoursePlacement } from './scenarios';
import { computePlacementMetrics, computeRevenue, membershipRevenueStream } from './scenarios';

export type CaseType = 'baseline' | 'best' | 'worst' | 'custom';
export type LineKind = 'revenue' | 'cost';
export type InputMode = 'flat' | 'growth' | 'manual' | 'linked-scenario' | 'driver';
export type LinkedField = 'revenue' | 'cost' | 'profit';
export type DriverBase = 'revenue' | 'cost' | 'memberCount';

export interface FinancialModel {
  id: string;
  name: string;
  description?: string;
  caseType: CaseType;
  horizonMonths: number;
  startMonth: Date;
  startingCash: number;
  taxPercent: number;
  notes?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelLine {
  id: string;
  modelId: string;
  name: string;
  kind: LineKind;
  category?: string;
  inputMode: InputMode;
  flatAmount?: number;
  startAmount?: number;
  monthlyGrowthPercent?: number;
  manualValues?: number[]; // length = horizonMonths
  linkedScenarioId?: string;
  linkedField?: LinkedField;
  driverPercent?: number;
  driverBase?: DriverBase;
  order: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelHeadcount {
  id: string;
  modelId: string;
  name: string;
  role?: string;
  annualSalary: number;
  startMonth: Date;
  endMonth?: Date;
  benefitsPercent: number;
  notes?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Compute engine: produces the month-by-month projection for a model.
// ---------------------------------------------------------------------------

export interface ComputedModel {
  monthLabels: string[]; // "2026-05" etc, length = horizonMonths
  monthDates: Date[];
  byLine: Record<string, number[]>; // signed (revenue positive, cost negative? no — keep absolute; aggregation differentiates by kind)
  revenuePerLine: Record<string, number[]>; // only revenue lines
  costPerLine: Record<string, number[]>; // only cost lines (positive numbers)
  payrollPerMonth: number[];
  payrollByPerson: Record<string, number[]>;
  taxPerMonth: number[];
  totalRevenue: number[];
  totalCost: number[]; // includes payroll + tax
  profit: number[];
  cumulativeCash: number[];
  breakEvenMonth: number | null; // index of first month where cumulativeCash >= 0 (only meaningful if starts negative)
  firstProfitableMonth: number | null;
  runwayMonths: number | null; // when cumulativeCash crosses zero from positive
  memberCountPerMonth: number[]; // derived from linked-scenario lines that pull memberCount
  // Composite revenue mix
  revenueByCategory: Record<string, number>;
  costByCategory: Record<string, number>;
}

interface ComputeInputs {
  model: FinancialModel;
  lines: ModelLine[];
  headcount: ModelHeadcount[];
  // For linked-scenario resolution
  placementsByScenario?: Record<string, CoursePlacement[]>;
}

export function computeModel({ model, lines, headcount, placementsByScenario = {} }: ComputeInputs): ComputedModel {
  const N = model.horizonMonths;
  const start = startOfMonth(new Date(model.startMonth));

  const monthDates: Date[] = [];
  const monthLabels: string[] = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    monthDates.push(d);
    monthLabels.push(monthKey(d));
  }

  // Aggregate scenarios per month (for linked lines and member count driver)
  const scenarioRollups: Record<string, { revenue: number[]; cost: number[]; profit: number[]; members: number[] }> = {};
  for (const [scenarioId, placements] of Object.entries(placementsByScenario)) {
    const rollup = { revenue: zeros(N), cost: zeros(N), profit: zeros(N), members: zeros(N) };
    for (const p of placements) {
      const metrics = computePlacementMetrics(p);
      const rev = computeRevenue(p);
      // For one-off: revenue booked at delivery start; cost at delivery start
      // For membership: revenue spread across periods via stream; cost at delivery start
      const deliveryIdx = monthIndex(monthDates, metrics.deliveryStart);
      if (deliveryIdx >= 0 && deliveryIdx < N) {
        rollup.cost[deliveryIdx] += metrics.cost;
      }
      if (!p.isMembership) {
        if (deliveryIdx >= 0 && deliveryIdx < N) rollup.revenue[deliveryIdx] += rev;
      } else {
        const stream = membershipRevenueStream(p);
        for (const row of stream) {
          const idx = monthIndex(monthDates, row.date);
          if (idx >= 0 && idx < N) {
            rollup.revenue[idx] += row.revenue;
            rollup.members[idx] += row.activePaidMembers;
          }
        }
      }
    }
    for (let i = 0; i < N; i++) {
      rollup.profit[i] = rollup.revenue[i] - rollup.cost[i];
    }
    scenarioRollups[scenarioId] = rollup;
  }

  // Compute each non-driver line first
  const byLine: Record<string, number[]> = {};
  const revenuePerLine: Record<string, number[]> = {};
  const costPerLine: Record<string, number[]> = {};
  const memberCountPerMonth = zeros(N);

  const nonDriverLines = lines.filter((l) => l.inputMode !== 'driver');
  const driverLines = lines.filter((l) => l.inputMode === 'driver');

  for (const line of nonDriverLines) {
    const values = computeLineValues(line, N, scenarioRollups);
    byLine[line.id] = values;
    if (line.kind === 'revenue') revenuePerLine[line.id] = values;
    else costPerLine[line.id] = values;
  }

  // Aggregate scenario member counts into the model-level memberCount stream
  // (we use it as the driver base for "% of member count" lines)
  for (const line of lines) {
    if (line.inputMode === 'linked-scenario' && line.linkedScenarioId) {
      const rollup = scenarioRollups[line.linkedScenarioId];
      if (rollup) {
        for (let i = 0; i < N; i++) memberCountPerMonth[i] += rollup.members[i];
      }
    }
  }

  // Payroll
  const payrollPerMonth = zeros(N);
  const payrollByPerson: Record<string, number[]> = {};
  for (const hc of headcount) {
    const personStream = zeros(N);
    const hcStart = startOfMonth(new Date(hc.startMonth));
    const hcEnd = hc.endMonth ? startOfMonth(new Date(hc.endMonth)) : null;
    const monthlyCost = (hc.annualSalary / 12) * (1 + hc.benefitsPercent / 100);
    for (let i = 0; i < N; i++) {
      const month = monthDates[i];
      if (month >= hcStart && (!hcEnd || month <= hcEnd)) {
        personStream[i] = monthlyCost;
        payrollPerMonth[i] += monthlyCost;
      }
    }
    payrollByPerson[hc.id] = personStream;
  }

  // Compute totals (before driver lines + tax)
  const totalRevenue = zeros(N);
  const totalCost = zeros(N);
  for (let i = 0; i < N; i++) {
    for (const id in revenuePerLine) totalRevenue[i] += revenuePerLine[id][i];
    for (const id in costPerLine) totalCost[i] += costPerLine[id][i];
    totalCost[i] += payrollPerMonth[i];
  }

  // Now driver lines (% of revenue / cost / memberCount) — they read totals built above
  for (const line of driverLines) {
    const values = zeros(N);
    const pct = (line.driverPercent ?? 0) / 100;
    for (let i = 0; i < N; i++) {
      let base = 0;
      if (line.driverBase === 'cost') base = totalCost[i];
      else if (line.driverBase === 'memberCount') base = memberCountPerMonth[i];
      else base = totalRevenue[i]; // default revenue
      values[i] = base * pct;
    }
    byLine[line.id] = values;
    if (line.kind === 'revenue') {
      revenuePerLine[line.id] = values;
      for (let i = 0; i < N; i++) totalRevenue[i] += values[i];
    } else {
      costPerLine[line.id] = values;
      for (let i = 0; i < N; i++) totalCost[i] += values[i];
    }
  }

  // Tax: % of (revenue - cost) when positive
  const taxPerMonth = zeros(N);
  if (model.taxPercent > 0) {
    for (let i = 0; i < N; i++) {
      const preTax = totalRevenue[i] - totalCost[i];
      if (preTax > 0) taxPerMonth[i] = preTax * (model.taxPercent / 100);
    }
    for (let i = 0; i < N; i++) totalCost[i] += taxPerMonth[i];
  }

  // Profit + cumulative cash
  const profit = zeros(N);
  const cumulativeCash = zeros(N);
  let runningCash = model.startingCash;
  for (let i = 0; i < N; i++) {
    profit[i] = totalRevenue[i] - totalCost[i];
    runningCash += profit[i];
    cumulativeCash[i] = runningCash;
  }

  // Markers
  let breakEvenMonth: number | null = null;
  if (model.startingCash < 0) {
    for (let i = 0; i < N; i++) {
      if (cumulativeCash[i] >= 0) {
        breakEvenMonth = i;
        break;
      }
    }
  } else {
    // Otherwise, first profitable month is the marker
  }

  let firstProfitableMonth: number | null = null;
  for (let i = 0; i < N; i++) {
    if (profit[i] > 0) {
      firstProfitableMonth = i;
      break;
    }
  }

  let runwayMonths: number | null = null;
  if (model.startingCash > 0) {
    for (let i = 0; i < N; i++) {
      if (cumulativeCash[i] < 0) {
        runwayMonths = i;
        break;
      }
    }
  }

  // Category mix totals
  const revenueByCategory: Record<string, number> = {};
  const costByCategory: Record<string, number> = {};
  for (const line of lines) {
    const cat = line.category?.trim() || (line.kind === 'revenue' ? 'Uncategorized revenue' : 'Uncategorized cost');
    const arr = byLine[line.id] ?? zeros(N);
    const sum = arr.reduce((s, v) => s + v, 0);
    if (line.kind === 'revenue') revenueByCategory[cat] = (revenueByCategory[cat] ?? 0) + sum;
    else costByCategory[cat] = (costByCategory[cat] ?? 0) + sum;
  }
  if (payrollPerMonth.some((v) => v > 0)) {
    costByCategory['Payroll'] = (costByCategory['Payroll'] ?? 0) + payrollPerMonth.reduce((s, v) => s + v, 0);
  }

  return {
    monthLabels,
    monthDates,
    byLine,
    revenuePerLine,
    costPerLine,
    payrollPerMonth,
    payrollByPerson,
    taxPerMonth,
    totalRevenue,
    totalCost,
    profit,
    cumulativeCash,
    breakEvenMonth,
    firstProfitableMonth,
    runwayMonths,
    memberCountPerMonth,
    revenueByCategory,
    costByCategory,
  };
}

function computeLineValues(
  line: ModelLine,
  N: number,
  scenarioRollups: Record<string, { revenue: number[]; cost: number[]; profit: number[]; members: number[] }>,
): number[] {
  const values = zeros(N);
  switch (line.inputMode) {
    case 'flat': {
      const amount = line.flatAmount ?? 0;
      for (let i = 0; i < N; i++) values[i] = amount;
      break;
    }
    case 'growth': {
      const start = line.startAmount ?? 0;
      const r = (line.monthlyGrowthPercent ?? 0) / 100;
      for (let i = 0; i < N; i++) values[i] = start * Math.pow(1 + r, i);
      break;
    }
    case 'manual': {
      const arr = line.manualValues ?? [];
      for (let i = 0; i < N; i++) values[i] = arr[i] ?? 0;
      break;
    }
    case 'linked-scenario': {
      if (line.linkedScenarioId) {
        const rollup = scenarioRollups[line.linkedScenarioId];
        if (rollup) {
          const field = line.linkedField ?? 'revenue';
          const src = field === 'cost' ? rollup.cost : field === 'profit' ? rollup.profit : rollup.revenue;
          for (let i = 0; i < N; i++) values[i] = src[i];
        }
      }
      break;
    }
    default:
      break;
  }
  return values;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthIndex(monthDates: Date[], target: Date): number {
  const key = monthKey(target);
  return monthDates.findIndex((d) => monthKey(d) === key);
}

function zeros(n: number): number[] {
  return new Array(n).fill(0);
}
