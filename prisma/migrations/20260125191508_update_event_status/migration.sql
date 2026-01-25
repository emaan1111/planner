-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "status" SET DEFAULT 'scheduled';

-- UpdateExistingData
UPDATE "Event" SET "status" = 'scheduled' WHERE "status" = 'planned';
UPDATE "Event" SET "status" = 'done' WHERE "status" = 'completed';
UPDATE "Event" SET "status" = 'no-action' WHERE "status" = 'cancelled';

