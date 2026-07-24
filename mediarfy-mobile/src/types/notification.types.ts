export type NotificationType =
  | 'CASE_STATUS_CHANGED'
  | 'SESSION_CREATED'
  | 'SESSION_RESCHEDULED'
  | 'SESSION_STATUS_CHANGED'
  | 'INVITATION_CREATED'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_REJECTED'
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_VERSION_CREATED'
  | 'DOCUMENT_ARCHIVED'
  | 'DOCUMENT_RESTORED'
  | 'DOCUMENT_DELETED'
  | 'GENERAL';

export type NotificationStatus =
  | 'UNREAD'
  | 'READ'
  | 'ARCHIVED';

export interface AppNotification {
  id: string;
  userId: string;

  type: NotificationType;
  status: NotificationStatus;

  title: string;
  message: string;

  caseId: string | null;
  sessionId: string | null;
  invitationId: string | null;
  documentId: string | null;

  metadata: Record<
    string,
    string | number | boolean | null
  > | null;

  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
}

export interface UnreadNotificationCount {
  count: number;
}

export interface MarkAllNotificationsResponse {
  updated: number;
}