-- CreateEnum
CREATE TYPE "CaseDocumentType" AS ENUM ('IDENTIFICATION', 'PROPERTY_DOCUMENT', 'CONTRACT', 'REQUEST', 'EVIDENCE', 'AGREEMENT_DRAFT', 'SIGNED_AGREEMENT', 'REGISTRATION_PROOF', 'PAYMENT_RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseDocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateTable
CREATE TABLE "case_documents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CaseDocumentType" NOT NULL,
    "status" "CaseDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "case_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_documents_caseId_idx" ON "case_documents"("caseId");

-- CreateIndex
CREATE INDEX "case_documents_uploadedById_idx" ON "case_documents"("uploadedById");

-- CreateIndex
CREATE INDEX "case_documents_type_idx" ON "case_documents"("type");

-- CreateIndex
CREATE INDEX "case_documents_status_idx" ON "case_documents"("status");

-- CreateIndex
CREATE INDEX "case_document_versions_documentId_idx" ON "case_document_versions"("documentId");

-- CreateIndex
CREATE INDEX "case_document_versions_uploadedById_idx" ON "case_document_versions"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "case_document_versions_documentId_versionNumber_key" ON "case_document_versions"("documentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "mediation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_document_versions" ADD CONSTRAINT "case_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "case_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_document_versions" ADD CONSTRAINT "case_document_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
