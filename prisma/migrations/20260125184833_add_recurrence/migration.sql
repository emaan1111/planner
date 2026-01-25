-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "parentEventId" TEXT,
ADD COLUMN     "recurrence" JSONB;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
