import type {
  NotificationType,
} from '../types/notification.types';

export const notificationTypeLabels: Record<
  NotificationType,
  string
> = {
  CASE_STATUS_CHANGED:
    'Cambio de estado',
  SESSION_CREATED:
    'Sesión programada',
  SESSION_RESCHEDULED:
    'Sesión reprogramada',
  SESSION_STATUS_CHANGED:
    'Cambio de sesión',
  INVITATION_CREATED:
    'Nueva invitación',
  INVITATION_ACCEPTED:
    'Invitación aceptada',
  INVITATION_REJECTED:
    'Invitación rechazada',
  DOCUMENT_CREATED:
    'Nuevo documento',
  DOCUMENT_VERSION_CREATED:
    'Nueva versión',
  DOCUMENT_ARCHIVED:
    'Documento archivado',
  DOCUMENT_RESTORED:
    'Documento restaurado',
  DOCUMENT_DELETED:
    'Documento eliminado',
  GENERAL:
    'Notificación',
};

export function getNotificationSymbol(
  type: NotificationType,
): string {
  switch (type) {
    case 'CASE_STATUS_CHANGED':
      return '↻';

    case 'SESSION_CREATED':
    case 'SESSION_RESCHEDULED':
    case 'SESSION_STATUS_CHANGED':
      return '◷';

    case 'INVITATION_CREATED':
    case 'INVITATION_ACCEPTED':
    case 'INVITATION_REJECTED':
      return '✉';

    case 'DOCUMENT_CREATED':
    case 'DOCUMENT_VERSION_CREATED':
    case 'DOCUMENT_ARCHIVED':
    case 'DOCUMENT_RESTORED':
    case 'DOCUMENT_DELETED':
      return '▤';

    default:
      return '●';
  }
}