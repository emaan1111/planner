-- AlterTable
ALTER TABLE "VideoProject" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'upload',
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "youtubeId" TEXT;

-- CreateTable
CREATE TABLE "TranscriptionJob" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'youtube',
    "url" TEXT NOT NULL,
    "youtubeId" TEXT,
    "title" TEXT,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "stage" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "batchId" TEXT,
    "videoProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranscriptionJob_status_idx" ON "TranscriptionJob"("status");

-- CreateIndex
CREATE INDEX "TranscriptionJob_batchId_idx" ON "TranscriptionJob"("batchId");
