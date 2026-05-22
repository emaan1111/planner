import { EventColor } from './index';

export interface CourseTemplate {
  id: string;
  name: string;
  description?: string;
  marketingDurationDays: number;
  deliveryDurationDays: number;
  defaultPricePerChild: number;
  defaultCostPerRun: number;
  defaultProjectedRegistrations: number;
  defaultLikelihoodPercent: number;
  defaultRisks?: string;
  defaultNotes?: string;
  marketingColor: EventColor;
  deliveryColor: EventColor;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CoursePlacement {
  id: string;
  scenarioId: string;
  courseTemplateId: string;
  startDate: Date;
  marketingDurationDays: number;
  deliveryDurationDays: number;
  pricePerChild: number;
  costPerRun: number;
  projectedRegistrations: number;
  likelihoodPercent: number;
  risks?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Optional joined data (some endpoints include the template)
  courseTemplate?: CourseTemplate;
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

export function computePlacementMetrics(p: CoursePlacement): PlacementMetrics {
  const revenue = p.pricePerChild * p.projectedRegistrations;
  const cost = p.costPerRun;
  const profit = revenue - cost;
  const expectedValue = profit * (p.likelihoodPercent / 100);
  const marketingStart = new Date(p.startDate);
  const deliveryStart = addDays(marketingStart, p.marketingDurationDays);
  const deliveryEnd = addDays(deliveryStart, p.deliveryDurationDays - 1);
  return {
    revenue,
    cost,
    profit,
    expectedValue,
    marketingStart,
    marketingEnd: deliveryStart,
    deliveryStart,
    deliveryEnd,
  };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
