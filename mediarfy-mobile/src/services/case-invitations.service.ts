import { api } from "./api.service";
import {
  AcceptInvitationResponse,
  CaseInvitation,
  CreateCaseInvitationData,
} from "../types/case-invitation.types";

export const caseInvitationsService = {
  async getMine(): Promise<CaseInvitation[]> {
    const response = await api.get<CaseInvitation[]>("/invitations/mine");

    return response.data;
  },

  async accept(invitationId: string): Promise<AcceptInvitationResponse> {
    const response = await api.patch<AcceptInvitationResponse>(
      `/invitations/${invitationId}/accept`,
    );

    return response.data;
  },

  async reject(invitationId: string): Promise<CaseInvitation> {
    const response = await api.patch<CaseInvitation>(
      `/invitations/${invitationId}/reject`,
    );

    return response.data;
  },

  async getByCase(caseId: string): Promise<CaseInvitation[]> {
    const response = await api.get<CaseInvitation[]>(
      `/cases/${caseId}/invitations`,
    );

    return response.data;
  },

  async create(
    caseId: string,
    data: CreateCaseInvitationData,
  ): Promise<CaseInvitation> {
    const response = await api.post<CaseInvitation>(
      `/cases/${caseId}/invitations`,
      data,
    );

    return response.data;
  },
};
