-- CreateTable: CourseTemplate
CREATE TABLE "CourseTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "marketingDurationDays" INTEGER NOT NULL DEFAULT 14,
    "deliveryDurationDays" INTEGER NOT NULL DEFAULT 7,
    "defaultPricePerChild" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultCostPerRun" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultProjectedRegistrations" INTEGER NOT NULL DEFAULT 0,
    "defaultLikelihoodPercent" INTEGER NOT NULL DEFAULT 70,
    "defaultRisks" TEXT,
    "defaultNotes" TEXT,
    "marketingColor" TEXT NOT NULL DEFAULT 'purple',
    "deliveryColor" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseTemplate_name_key" ON "CourseTemplate"("name");

-- CreateTable: ScenarioFolder
CREATE TABLE "ScenarioFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'indigo',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScenarioFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Scenario
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "folderId" TEXT,
    "color" TEXT NOT NULL DEFAULT 'indigo',
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ScenarioFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: CoursePlacement
CREATE TABLE "CoursePlacement" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "courseTemplateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "marketingDurationDays" INTEGER NOT NULL,
    "deliveryDurationDays" INTEGER NOT NULL,
    "pricePerChild" DOUBLE PRECISION NOT NULL,
    "costPerRun" DOUBLE PRECISION NOT NULL,
    "projectedRegistrations" INTEGER NOT NULL,
    "likelihoodPercent" INTEGER NOT NULL DEFAULT 70,
    "risks" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CoursePlacement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoursePlacement_scenarioId_idx" ON "CoursePlacement"("scenarioId");
CREATE INDEX "CoursePlacement_courseTemplateId_idx" ON "CoursePlacement"("courseTemplateId");

ALTER TABLE "CoursePlacement" ADD CONSTRAINT "CoursePlacement_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoursePlacement" ADD CONSTRAINT "CoursePlacement_courseTemplateId_fkey" FOREIGN KEY ("courseTemplateId") REFERENCES "CourseTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
