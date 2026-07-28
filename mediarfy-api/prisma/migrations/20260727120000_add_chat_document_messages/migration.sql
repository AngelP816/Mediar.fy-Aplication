ALTER TYPE "ChatMessageType" ADD VALUE 'DOCUMENT';

ALTER TABLE "chat_messages"
ADD COLUMN "documentId" TEXT;

CREATE INDEX "chat_messages_documentId_idx"
ON "chat_messages"("documentId");

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_documentId_fkey"
FOREIGN KEY ("documentId")
REFERENCES "case_documents"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
