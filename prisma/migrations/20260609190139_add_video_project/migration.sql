-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled video',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "durationSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fileName" TEXT,
    "words" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);
