/*
  Warnings:

  - You are about to drop the `CustomPlanType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HiddenPlanType` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "CustomPlanType";

-- DropTable
DROP TABLE "HiddenPlanType";

-- CreateTable
CREATE TABLE "PlanType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Star',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanType_name_key" ON "PlanType"("name");
