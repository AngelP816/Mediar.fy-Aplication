import {
  CaseDocumentType,
} from '../types/case-document.types';

export const documentTypeLabels: Record<
  CaseDocumentType,
  string
> = {
  IDENTIFICATION: 'Identificación',
  PROPERTY_DOCUMENT:
    'Documento de propiedad',
  CONTRACT: 'Contrato',
  REQUEST: 'Solicitud',
  EVIDENCE: 'Evidencia',
  AGREEMENT_DRAFT:
    'Borrador de convenio',
  SIGNED_AGREEMENT:
    'Convenio firmado',
  REGISTRATION_PROOF:
    'Comprobante de registro',
  PAYMENT_RECEIPT:
    'Comprobante de pago',
  OTHER: 'Otro',
};

export function formatFileSize(
  sizeBytes: number,
): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(
      sizeBytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    sizeBytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}