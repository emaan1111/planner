-- Add gap-days default to course templates and membership projection fields
ALTER TABLE "CourseTemplate" ADD COLUMN "defaultGapDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CourseTemplate" ADD COLUMN "isMembership" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CourseTemplate" ADD COLUMN "billingPeriodDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "CourseTemplate" ADD COLUMN "defaultMonthlyChurnPercent" DOUBLE PRECISION NOT NULL DEFAULT 5;
ALTER TABLE "CourseTemplate" ADD COLUMN "defaultRetentionMonths" INTEGER NOT NULL DEFAULT 12;

-- Membership overrides on placement
ALTER TABLE "CoursePlacement" ADD COLUMN "isMembership" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CoursePlacement" ADD COLUMN "monthlyChurnPercent" DOUBLE PRECISION NOT NULL DEFAULT 5;
ALTER TABLE "CoursePlacement" ADD COLUMN "retentionMonths" INTEGER NOT NULL DEFAULT 12;
-- Trial-to-paid funnel (entryMode = 'direct' | 'trial-to-paid')
ALTER TABLE "CoursePlacement" ADD COLUMN "entryMode" TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE "CoursePlacement" ADD COLUMN "trialDurationDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CoursePlacement" ADD COLUMN "trialToPaidConversionPercent" DOUBLE PRECISION NOT NULL DEFAULT 100;

-- Add an independent delivery start date to placements.
-- For existing rows backfill it as (marketing start + marketing duration) so behaviour is unchanged.
ALTER TABLE "CoursePlacement" ADD COLUMN "deliveryStartDate" TIMESTAMP(3);
UPDATE "CoursePlacement"
SET "deliveryStartDate" = "startDate" + ("marketingDurationDays" || ' days')::interval;
ALTER TABLE "CoursePlacement" ALTER COLUMN "deliveryStartDate" SET NOT NULL;

-- Per-scenario key dates and holidays (separate from the global Event model)
CREATE TABLE "ScenarioEvent" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'amber',
    "kind" TEXT NOT NULL DEFAULT 'note',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScenarioEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScenarioEvent_scenarioId_idx" ON "ScenarioEvent"("scenarioId");

ALTER TABLE "ScenarioEvent" ADD CONSTRAINT "ScenarioEvent_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
