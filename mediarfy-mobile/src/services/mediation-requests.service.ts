import {
  CreateMediationRequestData,
  DecideMediationRequestData,
  DecideMediationRequestResponse,
  MediationRequest,
  MediationRequestDetail,
} from "../types/mediation-request.types";
import { api } from "./api.service";

export const mediationRequestsService = {
  async create(data: CreateMediationRequestData): Promise<MediationRequest> {
    const response = await api.post<MediationRequest>(
      "/mediation-requests",
      data,
    );

    return response.data;
  },

  async getMine(): Promise<MediationRequest[]> {
    const response = await api.get<MediationRequest[]>(
      "/mediation-requests/mine",
    );

    return response.data;
  },

  async getPending(): Promise<MediationRequest[]> {
    const response = await api.get<MediationRequest[]>(
      "/mediation-requests/pending",
    );

    return response.data;
  },

  async getById(id: string): Promise<MediationRequestDetail> {
    const response = await api.get<MediationRequestDetail>(
      `/mediation-requests/${id}`,
    );

    return response.data;
  },

  async startReview(id: string): Promise<MediationRequestDetail> {
    const response = await api.patch<MediationRequestDetail>(
      `/mediation-requests/${id}/start-review`,
    );

    return response.data;
  },

  async decide(
    id: string,
    data: DecideMediationRequestData,
  ): Promise<DecideMediationRequestResponse> {
    const response = await api.patch<DecideMediationRequestResponse>(
      `/mediation-requests/${id}/decision`,
      data,
    );

    return response.data;
  },
};
