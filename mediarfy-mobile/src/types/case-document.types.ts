export type CaseDocumentType =
  | 'IDENTIFICATION'
  | 'PROPERTY_DOCUMENT'
  | 'CONTRACT'
  | 'REQUEST'
  | 'EVIDENCE'
  | 'AGREEMENT_DRAFT'
  | 'SIGNED_AGREEMENT'
  | 'REGISTRATION_PROOF'
  | 'PAYMENT_RECEIPT'
  | 'OTHER';

export type CaseDocumentStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'DELETED';

export interface DocumentUser {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface CaseDocumentVersion {
  id: string;
  documentId: string;
  uploadedById: string;

  versionNumber: number;

  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;

  checksum: string | null;
  notes: string | null;

  createdAt: string;

  uploadedBy: DocumentUser;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  uploadedById: string;

  name: string;
  description: string | null;
  type: CaseDocumentType;
  status: CaseDocumentStatus;

  currentVersion: number;

  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;

  uploadedBy: DocumentUser;

  /**
   * El GET del backend devuelve la versión actual
   * dentro de un arreglo con un solo elemento.
   */
  versions: CaseDocumentVersion[];
}

export interface SelectedDocumentFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export interface CreateCaseDocumentData {
  name: string;
  description?: string;
  type: CaseDocumentType;
  notes?: string;
}

export interface CreateDocumentVersionData {
  notes?: string;
}