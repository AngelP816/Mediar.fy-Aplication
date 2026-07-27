-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHAT_MESSAGE_RECEIVED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "messageId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_conversationId_idx" ON "notifications"("conversationId");

-- CreateIndex
CREATE INDEX "notifications_messageId_idx" ON "notifications"("messageId");
