export type MediationRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

export type MediationType =
  | 'LEASE'
  | 'PURCHASE_SALE'
  | 'PROPERTY_DELIVERY'
  | 'CONTRACT_BREACH'
  | 'NEIGHBOR_CONFLICT'
  | 'OTHER';

export type UrgencyLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export interface AssignedMediator {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MediationRequest {
  id: string;
  folio: string;
  title: string;
  description: string;
  type: MediationType;
  urgency: UrgencyLevel;
  status: MediationRequestStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  decisionAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  assignedMediator: AssignedMediator | null;
}

export interface CreateMediationRequestData {
  title: string;
  description: string;
  type: MediationType;
  urgency?: UrgencyLevel;
}

import { UserRole } from './auth.types';

export interface RequestClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface RequestHistoryUser {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface RequestStatusHistory {
  id: string;
  fromStatus: MediationRequestStatus | null;
  toStatus: MediationRequestStatus;
  comment: string | null;
  createdAt: string;
  changedBy: RequestHistoryUser;
}

export interface MediationRequestDetail
  extends MediationRequest {
  client: RequestClient;
  statusHistory: RequestStatusHistory[];
}

export interface DecideMediationRequestData {
  decision: 'ACCEPTED' | 'REJECTED';
  rejectionReason?: string;
  comment?: string;
}

export interface CreatedCaseSummary {
  id: string;
  folio: string;
  title: string;
  status: string;
}

export interface DecideMediationRequestResponse {
  request: MediationRequestDetail;
  case: CreatedCaseSummary | null;
}