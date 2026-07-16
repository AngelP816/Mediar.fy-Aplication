import {
  MediationCase,
  MediationCaseDetail,
  UpdateCaseStatusData,
} from '../types/case.types';
import { api } from './api.service';

export const casesService = {
  async getMine(): Promise<MediationCase[]> {
    const response = await api.get<MediationCase[]>(
      '/cases/mine',
    );

    return response.data;
  },

  async getById(
    id: string,
  ): Promise<MediationCaseDetail> {
    const response =
      await api.get<MediationCaseDetail>(
        `/cases/${id}`,
      );

    return response.data;
  },

  async updateStatus(
    id: string,
    data: UpdateCaseStatusData,
  ): Promise<MediationCaseDetail> {
    const response =
      await api.patch<MediationCaseDetail>(
        `/cases/${id}/status`,
        data,
      );

    return response.data;
  },
};