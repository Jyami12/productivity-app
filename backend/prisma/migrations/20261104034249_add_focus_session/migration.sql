-- CreateEnum
CREATE TYPE "FocusMode" AS ENUM ('countdown', 'stopwatch');

-- CreateEnum
CREATE TYPE "FocusSessionStatus" AS ENUM ('active', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "mode" "FocusMode" NOT NULL,
    "plannedSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "pausedSeconds" INTEGER NOT NULL DEFAULT 0,
    "endedAt" TIMESTAMP(3),
    "creditedSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" "FocusSessionStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusSession_userId_status_idx" ON "FocusSession"("userId", "status");

-- CreateIndex
CREATE INDEX "FocusSession_userId_endedAt_idx" ON "FocusSession"("userId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FocusSession_one_active_per_user" ON "FocusSession"("userId") WHERE (status = 'active');

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data integrity rules Prisma can't express; the API enforces the same rules.
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_planned_matches_mode"
  CHECK (CASE "mode"
    WHEN 'countdown' THEN "plannedSeconds" IS NOT NULL AND "plannedSeconds" > 0
    ELSE "plannedSeconds" IS NULL
  END);
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_nonnegative_seconds"
  CHECK ("pausedSeconds" >= 0 AND "creditedSeconds" >= 0);
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_ended_matches_status"
  CHECK (("status" = 'active') = ("endedAt" IS NULL));
