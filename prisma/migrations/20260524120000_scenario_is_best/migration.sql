-- AlterTable: flag a scenario as the "best" pick in the sidebar.
ALTER TABLE "Scenario" ADD COLUMN "isBest" BOOLEAN NOT NULL DEFAULT false;
