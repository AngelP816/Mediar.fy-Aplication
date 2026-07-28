export type ChatConversationStatus =
  | 'ACTIVE'
  | 'CLOSED'
  | 'ARCHIVED';

export type ChatMessageType =
  | 'TEXT'
  | 'SYSTEM'
  | 'DOCUMENT';

export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'CLIENT' | 'MEDIATOR' | 'ADMIN';
}

export interface ChatParticipant {
  id: string;
  userId: string;
  joinedAt: string;
  lastReadAt: string | null;
  user: ChatUser;
}

export interface ChatCase {
  id: string;
  folio: string;
  title: string;
  status: string;
}

export interface ChatConversation {
  id: string;
  caseId: string;
  status: ChatConversationStatus;
  createdAt: string;
  updatedAt: string;
  case: ChatCase;
  participants: ChatParticipant[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  type: ChatMessageType;
  content: string;
  createdAt: string;
  updatedAt: string;
  sender: ChatUser | null;
  documentId: string | null;
  document: ChatMessageDocument | null;
}

export interface ChatMessageDocumentVersion {
  id: string;
  versionNumber: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ChatMessageDocument {
  id: string;
  caseId: string;
  name: string;
  type: import('./case-document.types').CaseDocumentType;
  status: import('./case-document.types').CaseDocumentStatus;
  currentVersion: number;
  versions: ChatMessageDocumentVersion[];
}

export interface ChatConversationSummary {
  id: string;
  caseId: string;
  status: ChatConversationStatus;
  createdAt: string;
  updatedAt: string;
  case: ChatCase;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  participants: ChatParticipant[];
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextBefore: string | null;
}

export interface ChatUnreadCountResponse {
  count: number;
}

export interface ChatReadResponse {
  readAt: string;
}

export interface ChatReadEvent {
  conversationId: string;
  userId: string;
  readAt: string;
}

export interface ChatConversationStatusChangedEvent {
  conversationId: string;
  caseId: string;
  status: ChatConversationStatus;
  changedAt: string;
}
