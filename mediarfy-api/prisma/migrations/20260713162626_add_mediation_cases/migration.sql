-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'INFORMATION_PENDING', 'SESSION_SCHEDULED', 'IN_MEDIATION', 'AGREEMENT_DRAFTING', 'AWAITING_SIGNATURES', 'SIGNED', 'REGISTRATION_PENDING', 'CLOSED_SUCCESS', 'CLOSED_NO_AGREEMENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CaseParticipantRole" AS ENUM ('REQUESTING_PARTY', 'INVITED_PARTY', 'MEDIATOR', 'OBSERVER');

-- CreateTable
CREATE TABLE "mediation_cases" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "requestId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "mediatorId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "mediation_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_participants" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "CaseParticipantRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_status_history" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mediation_cases_folio_key" ON "mediation_cases"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "mediation_cases_requestId_key" ON "mediation_cases"("requestId");

-- CreateIndex
CREATE INDEX "mediation_cases_clientId_idx" ON "mediation_cases"("clientId");

-- CreateIndex
CREATE INDEX "mediation_cases_mediatorId_idx" ON "mediation_cases"("mediatorId");

-- CreateIndex
CREATE INDEX "mediation_cases_status_idx" ON "mediation_cases"("status");

-- CreateIndex
CREATE INDEX "mediation_cases_createdAt_idx" ON "mediation_cases"("createdAt");

-- CreateIndex
CREATE INDEX "case_participants_caseId_idx" ON "case_participants"("caseId");

-- CreateIndex
CREATE INDEX "case_participants_userId_idx" ON "case_participants"("userId");

-- CreateIndex
CREATE INDEX "case_status_history_caseId_idx" ON "case_status_history"("caseId");

-- CreateIndex
CREATE INDEX "case_status_history_changedById_idx" ON "case_status_history"("changedById");

-- CreateIndex
CREATE INDEX "case_status_history_createdAt_idx" ON "case_status_history"("createdAt");

-- AddForeignKey
ALTER TABLE "mediation_cases" ADD CONSTRAINT "mediation_cases_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "mediation_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediation_cases" ADD CONSTRAINT "mediation_cases_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediation_cases" ADD CONSTRAINT "mediation_cases_mediatorId_fkey" FOREIGN KEY ("mediatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_participants" ADD CONSTRAINT "case_participants_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "mediation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_participants" ADD CONSTRAINT "case_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "mediation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
