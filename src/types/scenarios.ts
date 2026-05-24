import { EventColor } from './index';

export interface CourseTemplate {
  id: string;
  name: string;
  description?: string;
  marketingDurationDays: number;
  deliveryDurationDays: number;
  defaultGapDays: number; // typical days between marketing end and delivery start
  defaultPricePerChild: number;
  defaultCostPerRun: number;
  defaultProjectedRegistrations: number;
  defaultLikelihoodPercent: number;
  defaultRisks?: string;
  defaultNotes?: string;
  marketingColor: EventColor;
  deliveryColor: EventColor;
  // Membership projection settings
  isMembership: boolean;
  billingPeriodDays: number; // typical 30 = monthly
  defaultMonthlyChurnPercent: number;
  defaultRetentionMonths: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioFolder {
  id: string;
  name: string;
  color: EventColor;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  folderId?: string;
  color: EventColor;
  notes?: string;
  order: number;
  isBest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoursePlacement {
  id: string;
  scenarioId: string;
  courseTemplateId: string;
  startDate: Date; // marketing start date
  deliveryStartDate: Date; // independent — may sit days, weeks, or months after marketing ends
  marketingDurationDays: number;
  deliveryDurationDays: number;
  pricePerChild: number;
  costPerRun: number;
  projectedRegistrations: number;
  likelihoodPercent: number;
  risks?: string;
  notes?: string;
  // Membership overrides — used when isMembership=true
  isMembership: boolean;
  monthlyChurnPercent: number;
  retentionMonths: number;
  entryMode: 'direct' | 'trial-to-paid';
  trialDurationDays: number; // days before paid status kicks in (0 if direct)
  trialToPaidConversionPercent: number; // % of trial users that convert to paid (100 if direct)
  createdAt: Date;
  updatedAt: Date;
  // Optional joined data (some endpoints include the template)
  courseTemplate?: CourseTemplate;
}

export interface ScenarioEvent {
  id: string;
  scenarioId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color: EventColor;
  kind: 'note' | 'holiday' | 'milestone';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Override scope for dial changes — drives "this scenario only / all calendars / template default"
export type OverrideScope = 'this-placement' | 'all-placements-of-course' | 'template-default';

export interface PlacementMetrics {
  revenue: number;
  cost: number;
  profit: number;
  expectedValue: number; // profit × (likelihood / 100)
  marketingStart: Date;
  marketingEnd: Date; // exclusive boundary (delivery start)
  deliveryStart: Date;
  deliveryEnd: Date; // inclusive last day
}

// Falls back to the linked course template's default when the placement's own
// value is 0/empty. This lets membership projections render meaningful numbers
// even before the user has filled in placement-specific overrides — the
// incomplete warning still flags that the placement is using defaults.
export function effectiveCohort(p: CoursePlacement): number {
  if (p.projectedRegistrations > 0) return p.projectedRegistrations;
  return p.courseTemplate?.defaultProjectedRegistrations ?? 0;
}

export function effectivePrice(p: CoursePlacement): number {
  if (p.pricePerChild > 0) return p.pricePerChild;
  return p.courseTemplate?.defaultPricePerChild ?? 0;
}

export function effectiveChurn(p: CoursePlacement): number {
  if (p.monthlyChurnPercent > 0) return p.monthlyChurnPercent;
  return p.courseTemplate?.defaultMonthlyChurnPercent ?? 0;
}

export function effectiveRetention(p: CoursePlacement): number {
  if (p.retentionMonths > 0) return p.retentionMonths;
  return p.courseTemplate?.defaultRetentionMonths ?? 12;
}

export function computePlacementMetrics(p: CoursePlacement): PlacementMetrics {
  const revenue = computeRevenue(p);
  const cost = p.costPerRun;
  const profit = revenue - cost;
  const expectedValue = profit * (p.likelihoodPercent / 100);
  const marketingStart = new Date(p.startDate);
  const marketingEnd = addDays(marketingStart, p.marketingDurationDays); // exclusive
  const deliveryStart = new Date(p.deliveryStartDate);
  const deliveryEnd = addDays(deliveryStart, p.deliveryDurationDays - 1); // inclusive last day
  return {
    revenue,
    cost,
    profit,
    expectedValue,
    marketingStart,
    marketingEnd,
    deliveryStart,
    deliveryEnd,
  };
}

// Returns the number of paying members after the trial funnel converts.
function paidCohort(p: CoursePlacement): number {
  const cohort = effectiveCohort(p);
  if (p.entryMode === 'trial-to-paid') {
    return cohort * (p.trialToPaidConversionPercent / 100);
  }
  return cohort;
}

// One-off course: simple price × registrations (no trial funnel — registrations already pay).
// Membership: trial→paid funnel then geometric churn-adjusted revenue across N billing periods.
export function computeRevenue(p: CoursePlacement): number {
  const price = effectivePrice(p);
  if (!p.isMembership) {
    return price * effectiveCohort(p);
  }
  const cohort = paidCohort(p);
  const r = effectiveChurn(p) / 100;
  const N = effectiveRetention(p);
  if (r <= 0) return price * cohort * N;
  if (r >= 1) return price * cohort;
  const factor = (1 - Math.pow(1 - r, N)) / r;
  return price * cohort * factor;
}

// Membership projection driven purely by churn (independent of retentionMonths).
// Walks period-by-period from delivery start, applying churn each period, and
// stops once the active cohort effectively dies out or the horizon is reached.
// This is the canonical projection used for "lifetime" revenue and members —
// retentionMonths only constrains the shorter membershipRevenueStream() below.
export function projectChurnStream(
  p: CoursePlacement,
  maxPeriods: number = 120,
): { date: Date; active: number; revenue: number }[] {
  const cohort = effectiveCohort(p);
  const price = effectivePrice(p);
  const r = Math.min(1, Math.max(0, effectiveChurn(p) / 100));
  const periodDays = p.courseTemplate?.billingPeriodDays ?? 30;
  const conv = p.trialToPaidConversionPercent / 100;
  const trialPeriods =
    p.entryMode === 'trial-to-paid' ? Math.ceil(p.trialDurationDays / periodDays) : 0;
  const out: { date: Date; active: number; revenue: number }[] = [];
  let active = 0;
  for (let k = 0; k < maxPeriods; k++) {
    const date = new Date(p.deliveryStartDate);
    date.setDate(date.getDate() + k * periodDays);
    if (p.entryMode === 'trial-to-paid') {
      if (k === trialPeriods) active = cohort * conv;
      else if (k > trialPeriods) active = Math.max(0, active - active * r);
    } else {
      if (k === 0) active = cohort;
      else active = Math.max(0, active - active * r);
    }
    const revenue = active * price;
    out.push({ date, active, revenue });
    if (k > 24 && active < 0.5) break;
    if (r >= 1 && k > trialPeriods) break;
  }
  return out;
}

// Canonical lifetime revenue for a placement: one-offs use price × cohort,
// memberships sum the churn-driven projection. Use this anywhere the UI
// shows "lifetime revenue" — keeps the sidebar, compare table, and detailed
// report in agreement.
export function computeLifetimeRevenue(p: CoursePlacement): number {
  if (!p.isMembership) return computeRevenue(p);
  return projectChurnStream(p).reduce((sum, row) => sum + row.revenue, 0);
}

// Per-period stream: signups, trial users, paid members, churned, active, revenue.
export interface MembershipPeriodProjection {
  periodIndex: number;
  date: Date;
  trialMembers: number; // people in their trial window during this period
  newPaidMembers: number; // people who just converted into paid this period
  activePaidMembers: number; // total paying members at start of period
  churnedMembers: number; // members lost since previous period
  revenue: number;
}

export function membershipRevenueStream(p: CoursePlacement): MembershipPeriodProjection[] {
  if (!p.isMembership) return [];
  const cohort = effectiveCohort(p);
  const price = effectivePrice(p);
  const r = effectiveChurn(p) / 100;
  const N = effectiveRetention(p);
  const periodDays = p.courseTemplate?.billingPeriodDays ?? 30;
  const conv = p.trialToPaidConversionPercent / 100;
  const trialPeriods = p.entryMode === 'trial-to-paid' ? Math.ceil(p.trialDurationDays / periodDays) : 0;
  const stream: MembershipPeriodProjection[] = [];
  let activePaid = 0;
  for (let k = 0; k < N; k++) {
    const date = new Date(p.deliveryStartDate);
    date.setDate(date.getDate() + k * periodDays);

    let trialMembers = 0;
    let newPaid = 0;
    if (p.entryMode === 'trial-to-paid') {
      if (k < trialPeriods) {
        // Cohort is still in trial — no revenue yet
        trialMembers = cohort;
      } else if (k === trialPeriods) {
        newPaid = cohort * conv;
        activePaid = newPaid;
      } else {
        const churn = activePaid * r;
        activePaid = Math.max(0, activePaid - churn);
      }
    } else {
      if (k === 0) {
        newPaid = cohort;
        activePaid = newPaid;
      } else {
        const churn = activePaid * r;
        activePaid = Math.max(0, activePaid - churn);
      }
    }

    const revenue = activePaid * price;
    // churn at this period = previous active * r when applicable
    const churnedMembers = k > trialPeriods ? activePaid * r : 0;

    stream.push({
      periodIndex: k,
      date,
      trialMembers,
      newPaidMembers: newPaid,
      activePaidMembers: activePaid,
      churnedMembers,
      revenue,
    });
  }
  return stream;
}

// Risk and likelihood buckets used in the detailed report.
export function riskLevel(p: CoursePlacement): 'low' | 'medium' | 'high' {
  // Combine financial exposure and a risks-text presence as a coarse score.
  const exposure = p.costPerRun - effectivePrice(p) * effectiveCohort(p) * (p.likelihoodPercent / 100);
  const hasNoted = (p.risks ?? '').trim().length > 0;
  if (exposure > 2000 || (hasNoted && exposure > 500)) return 'high';
  if (exposure > 0 || hasNoted) return 'medium';
  return 'low';
}

export function likelihoodLevel(p: CoursePlacement): 'unlikely' | 'possible' | 'likely' | 'very-likely' {
  if (p.likelihoodPercent >= 85) return 'very-likely';
  if (p.likelihoodPercent >= 60) return 'likely';
  if (p.likelihoodPercent >= 35) return 'possible';
  return 'unlikely';
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
