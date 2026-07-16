export type SessionModality =
  | 'IN_PERSON'
  | 'VIRTUAL'
  | 'HYBRID';

export type SessionStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export interface SessionCreator {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface MediationSession {
  id: string;
  caseId: string;
  createdById: string;

  title: string;
  description: string | null;

  scheduledAt: string;
  durationMinutes: number;

  modality: SessionModality;
  status: SessionStatus;

  location: string | null;
  meetingUrl: string | null;
  notes: string | null;

  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;

  createdBy: SessionCreator;
}

export interface CreateSessionData {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  modality: SessionModality;
  location?: string;
  meetingUrl?: string;
  notes?: string;
}