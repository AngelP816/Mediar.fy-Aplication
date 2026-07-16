-- CreateEnum
CREATE TYPE "SessionModality" AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "mediation_sessions" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "modality" "SessionModality" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "location" TEXT,
    "meetingUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "mediation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mediation_sessions_caseId_idx" ON "mediation_sessions"("caseId");

-- CreateIndex
CREATE INDEX "mediation_sessions_createdById_idx" ON "mediation_sessions"("createdById");

-- CreateIndex
CREATE INDEX "mediation_sessions_scheduledAt_idx" ON "mediation_sessions"("scheduledAt");

-- CreateIndex
CREATE INDEX "mediation_sessions_status_idx" ON "mediation_sessions"("status");

-- AddForeignKey
ALTER TABLE "mediation_sessions" ADD CONSTRAINT "mediation_sessions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "mediation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediation_sessions" ADD CONSTRAINT "mediation_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
