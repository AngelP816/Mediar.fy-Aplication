-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CASE_STATUS_CHANGED', 'SESSION_CREATED', 'SESSION_RESCHEDULED', 'SESSION_STATUS_CHANGED', 'INVITATION_CREATED', 'INVITATION_ACCEPTED', 'INVITATION_REJECTED', 'DOCUMENT_CREATED', 'DOCUMENT_VERSION_CREATED', 'DOCUMENT_ARCHIVED', 'DOCUMENT_RESTORED', 'DOCUMENT_DELETED', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "caseId" TEXT,
    "sessionId" TEXT,
    "invitationId" TEXT,
    "documentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_caseId_idx" ON "notifications"("caseId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
