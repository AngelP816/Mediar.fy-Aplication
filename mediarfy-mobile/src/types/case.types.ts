export type CaseStatus =
  | 'OPEN'
  | 'INFORMATION_PENDING'
  | 'SESSION_SCHEDULED'
  | 'IN_MEDIATION'
  | 'AGREEMENT_DRAFTING'
  | 'AWAITING_SIGNATURES'
  | 'SIGNED'
  | 'REGISTRATION_PENDING'
  | 'CLOSED_SUCCESS'
  | 'CLOSED_NO_AGREEMENT'
  | 'CANCELLED';

export type CaseParticipantRole =
  | 'REQUESTING_PARTY'
  | 'INVITED_PARTY'
  | 'MEDIATOR'
  | 'OBSERVER';

export interface CaseUserSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CaseRequestSummary {
  id: string;
  folio: string;
  type: string;
  urgency: string;
}

export interface CaseParticipant {
  id: string;
  userId: string | null;
  role: CaseParticipantRole;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStatusHistoryItem {
  id: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  comment: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface MediationCase {
  id: string;
  folio: string;
  title: string;
  description: string;
  status: CaseStatus;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  client: CaseUserSummary;
  mediator: CaseUserSummary;
}

export interface MediationCaseDetail extends MediationCase {
  request: CaseRequestSummary;

  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };

  mediator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };

  participants: CaseParticipant[];
  statusHistory: CaseStatusHistoryItem[];
}
export interface UpdateCaseStatusData {
  status: CaseStatus;
  comment?: string;
}