-- ----------------------------------------------------------------------------
-- CFO financial models: horizon-based P&L projections for the organization.
-- ----------------------------------------------------------------------------

CREATE TABLE "FinancialModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "caseType" TEXT NOT NULL DEFAULT 'baseline', -- baseline | best | worst | custom
    "horizonMonths" INTEGER NOT NULL DEFAULT 24,
    "startMonth" TIMESTAMP(3) NOT NULL,
    "startingCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelLine" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL, -- revenue | cost
    "category" TEXT,
    "inputMode" TEXT NOT NULL, -- flat | growth | manual | linked-scenario | driver
    "flatAmount" DOUBLE PRECISION,
    "startAmount" DOUBLE PRECISION,
    "monthlyGrowthPercent" DOUBLE PRECISION,
    "manualValues" JSONB,
    "linkedScenarioId" TEXT,
    "linkedField" TEXT, -- revenue | cost | profit
    "driverPercent" DOUBLE PRECISION,
    "driverBase" TEXT, -- revenue | cost | memberCount
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModelLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModelLine_modelId_idx" ON "ModelLine"("modelId");
ALTER TABLE "ModelLine" ADD CONSTRAINT "ModelLine_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FinancialModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ModelHeadcount" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "annualSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startMonth" TIMESTAMP(3) NOT NULL,
    "endMonth" TIMESTAMP(3),
    "benefitsPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModelHeadcount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModelHeadcount_modelId_idx" ON "ModelHeadcount"("modelId");
ALTER TABLE "ModelHeadcount" ADD CONSTRAINT "ModelHeadcount_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "FinancialModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
