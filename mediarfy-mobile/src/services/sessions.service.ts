import {
  CreateSessionData,
  MediationSession,
} from '../types/session.types';
import { api } from './api.service';

export const sessionsService = {
  async getByCase(
    caseId: string,
  ): Promise<MediationSession[]> {
    const response =
      await api.get<MediationSession[]>(
        `/cases/${caseId}/sessions`,
      );

    return response.data;
  },

  async create(
    caseId: string,
    data: CreateSessionData,
  ): Promise<MediationSession> {
    const response =
      await api.post<MediationSession>(
        `/cases/${caseId}/sessions`,
        data,
      );

    return response.data;
  },
};