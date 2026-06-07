-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bucket" TEXT NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "Task_bucket_idx" ON "Task"("bucket");

-- CreateIndex
CREATE INDEX "Task_archived_idx" ON "Task"("archived");
