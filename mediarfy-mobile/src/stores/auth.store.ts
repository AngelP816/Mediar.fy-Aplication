import axios from 'axios';
import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { tokenStorage } from '../services/token-storage.service';
import {
  AuthUser,
  LoginData,
  RegisterData,
} from '../types/auth.types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;

    if (Array.isArray(responseMessage)) {
      return responseMessage.join('\n');
    }

    if (typeof responseMessage === 'string') {
      return responseMessage;
    }

    if (error.code === 'ECONNABORTED') {
      return 'La conexión tardó demasiado';
    }

    if (!error.response) {
      return 'No fue posible conectar con el servidor';
    }
  }

  return 'Ocurrió un error inesperado';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  isSubmitting: false,
  error: null,

  initialize: async () => {
    set({
      isInitializing: true,
      error: null,
    });

    try {
      const accessToken =
        await tokenStorage.getAccessToken();

      const refreshToken =
        await tokenStorage.getRefreshToken();

      if (!accessToken || !refreshToken) {
        await tokenStorage.clearTokens();

        set({
          user: null,
          isAuthenticated: false,
          isInitializing: false,
        });

        return;
      }

      try {
        const user = await authService.getProfile();

        set({
          user,
          isAuthenticated: true,
          isInitializing: false,
        });
      } catch {
        const refreshed =
          await authService.refresh(refreshToken);

        await tokenStorage.saveTokens(
          refreshed.accessToken,
          refreshed.refreshToken,
        );

        const user = await authService.getProfile();

        set({
          user,
          isAuthenticated: true,
          isInitializing: false,
        });
      }
    } catch (error) {
      console.log(
        'No fue posible restaurar la sesión:',
        error,
      );

      await tokenStorage.clearTokens();

      set({
        user: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },

  login: async (data) => {
    set({
      isSubmitting: true,
      error: null,
    });

    try {
      const response = await authService.login(data);

      await tokenStorage.saveTokens(
        response.accessToken,
        response.refreshToken,
      );

      set({
        user: response.user,
        isAuthenticated: true,
        isSubmitting: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isSubmitting: false,
        error: getErrorMessage(error),
      });

      throw error;
    }
  },

  register: async (data) => {
    set({
      isSubmitting: true,
      error: null,
    });

    try {
      const response =
        await authService.register(data);

      await tokenStorage.saveTokens(
        response.accessToken,
        response.refreshToken,
      );

      set({
        user: response.user,
        isAuthenticated: true,
        isSubmitting: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isSubmitting: false,
        error: getErrorMessage(error),
      });

      throw error;
    }
  },

  logout: async () => {
    set({
      isSubmitting: true,
      error: null,
    });

    try {
      const refreshToken =
        await tokenStorage.getRefreshToken();

      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.log(
        'No fue posible cerrar la sesión en el servidor:',
        error,
      );
    } finally {
      await tokenStorage.clearTokens();

      set({
        user: null,
        isAuthenticated: false,
        isSubmitting: false,
        error: null,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));