import {
  MediationCase,
  MediationCaseDetail,
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
};