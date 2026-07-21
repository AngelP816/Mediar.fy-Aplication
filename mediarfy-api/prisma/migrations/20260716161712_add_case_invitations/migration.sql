-- CreateEnum
CREATE TYPE "CaseInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseParticipantRole" ADD VALUE 'LEGAL_REPRESENTATIVE';
ALTER TYPE "CaseParticipantRole" ADD VALUE 'LAWYER';

-- CreateTable
CREATE TABLE "case_invitations" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "participantRole" "CaseParticipantRole" NOT NULL DEFAULT 'INVITED_PARTY',
    "status" "CaseInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "case_invitations_token_key" ON "case_invitations"("token");

-- CreateIndex
CREATE INDEX "case_invitations_caseId_idx" ON "case_invitations"("caseId");

-- CreateIndex
CREATE INDEX "case_invitations_invitedById_idx" ON "case_invitations"("invitedById");

-- CreateIndex
CREATE INDEX "case_invitations_acceptedById_idx" ON "case_invitations"("acceptedById");

-- CreateIndex
CREATE INDEX "case_invitations_email_idx" ON "case_invitations"("email");

-- CreateIndex
CREATE INDEX "case_invitations_status_idx" ON "case_invitations"("status");

-- CreateIndex
CREATE INDEX "case_invitations_participantRole_idx" ON "case_invitations"("participantRole");

-- CreateIndex
CREATE INDEX "case_invitations_expiresAt_idx" ON "case_invitations"("expiresAt");

-- AddForeignKey
ALTER TABLE "case_invitations" ADD CONSTRAINT "case_invitations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "mediation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_invitations" ADD CONSTRAINT "case_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_invitations" ADD CONSTRAINT "case_invitations_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
