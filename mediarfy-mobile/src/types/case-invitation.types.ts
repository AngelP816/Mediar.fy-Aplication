import {
  CaseStatus,
} from './case.types';

export type CaseInvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type InvitationParticipantRole =
  | 'INVITED_PARTY'
  | 'LEGAL_REPRESENTATIVE'
  | 'LAWYER'
  | 'OBSERVER';

export interface InvitationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface InvitationCase {
  id: string;
  folio: string;
  title: string;
  description: string;
  status: CaseStatus;
  openedAt: string;
  mediator: InvitationUser;
}

export interface CaseInvitation {
  id: string;
  caseId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;

  participantRole: InvitationParticipantRole;
  status: CaseInvitationStatus;

  expiresAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;

  createdAt: string;
  updatedAt: string;

  mediationCase: InvitationCase;
  invitedBy: InvitationUser;
}

export interface AcceptInvitationResponse {
  invitation: CaseInvitation;
  participant: {
    id: string;
    caseId: string;
    userId: string;
    email: string | null;
    phone: string | null;
    role: InvitationParticipantRole;
  };
}

export interface CreateCaseInvitationData {
  email: string;
  phone?: string;
  participantRole: InvitationParticipantRole;
}