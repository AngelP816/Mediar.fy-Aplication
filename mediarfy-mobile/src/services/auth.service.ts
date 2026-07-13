import {
  AuthResponse,
  AuthUser,
  LoginData,
  RefreshResponse,
  RegisterData,
} from '../types/auth.types';
import { api } from './api.service';

export const authService = {
  async login(
    credentials: LoginData,
  ): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      '/auth/login',
      credentials,
    );

    return response.data;
  },

  async register(
    data: RegisterData,
  ): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      '/auth/register',
      data,
    );

    return response.data;
  },

  async getProfile(): Promise<AuthUser> {
    const response = await api.get<AuthUser>(
      '/auth/profile',
    );

    return response.data;
  },

  async refresh(
    refreshToken: string,
  ): Promise<RefreshResponse> {
    const response =
      await api.post<RefreshResponse>(
        '/auth/refresh',
        { refreshToken },
      );

    return response.data;
  },

  async logout(
    refreshToken: string,
  ): Promise<void> {
    await api.post('/auth/logout', {
      refreshToken,
    });
  },

  async logoutAll(): Promise<void> {
    await api.post('/auth/logout-all');
  },
};