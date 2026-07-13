-- CreateEnum
CREATE TYPE "MediationRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MediationType" AS ENUM ('LEASE', 'PURCHASE_SALE', 'PROPERTY_DELIVERY', 'CONTRACT_BREACH', 'NEIGHBOR_CONFLICT', 'OTHER');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "mediation_requests" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MediationType" NOT NULL,
    "urgency" "UrgencyLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "MediationRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "assignedMediatorId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "decisionAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "mediation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_status_history" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "fromStatus" "MediationRequestStatus",
    "toStatus" "MediationRequestStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mediation_requests_folio_key" ON "mediation_requests"("folio");

-- CreateIndex
CREATE INDEX "mediation_requests_clientId_idx" ON "mediation_requests"("clientId");

-- CreateIndex
CREATE INDEX "mediation_requests_assignedMediatorId_idx" ON "mediation_requests"("assignedMediatorId");

-- CreateIndex
CREATE INDEX "mediation_requests_status_idx" ON "mediation_requests"("status");

-- CreateIndex
CREATE INDEX "mediation_requests_createdAt_idx" ON "mediation_requests"("createdAt");

-- CreateIndex
CREATE INDEX "request_status_history_requestId_idx" ON "request_status_history"("requestId");

-- CreateIndex
CREATE INDEX "request_status_history_changedById_idx" ON "request_status_history"("changedById");

-- CreateIndex
CREATE INDEX "request_status_history_createdAt_idx" ON "request_status_history"("createdAt");

-- AddForeignKey
ALTER TABLE "mediation_requests" ADD CONSTRAINT "mediation_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediation_requests" ADD CONSTRAINT "mediation_requests_assignedMediatorId_fkey" FOREIGN KEY ("assignedMediatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "mediation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
