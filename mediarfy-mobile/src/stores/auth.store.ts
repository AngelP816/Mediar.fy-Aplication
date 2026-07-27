import { isAxiosError } from "axios";
import { create } from "zustand";

import { authService } from "../services/auth.service";
import { disconnectNotificationsSocket } from "../services/notifications-socket.service";
import { tokenStorage } from "../services/token-storage.service";
import type { AuthUser, LoginData, RegisterData } from "../types/auth.types";
import { useNotificationsStore } from "./notifications.store";
import { unregisterCurrentDevicePushToken } from "../services/push-notifications.service";
import { disconnectChatSocket } from '../services/chat-socket.service';

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
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;

    if (Array.isArray(responseMessage)) {
      return responseMessage.join("\n");
    }

    if (typeof responseMessage === "string") {
      return responseMessage;
    }

    if (error.code === "ECONNABORTED") {
      return "La conexión tardó demasiado";
    }

    if (!error.response) {
      return "No fue posible conectar con el servidor";
    }
  }

  return "Ocurrió un error inesperado";
}

function clearRealtimeSession(): void {
  disconnectNotificationsSocket();
  disconnectChatSocket();
  useNotificationsStore.getState().clearNotifications();
}

async function clearStoredTokens(): Promise<void> {
  try {
    await tokenStorage.clearTokens();
  } catch (error) {
    console.log("No fue posible eliminar los tokens locales:", error);
  }
}

let initializationPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  isSubmitting: false,
  error: null,

  initialize: async () => {
    if (initializationPromise) {
      return initializationPromise;
    }

    const currentInitialization = (async () => {
      set({
        isInitializing: true,
        error: null,
      });

      try {
        const [accessToken, refreshToken] = await Promise.all([
          tokenStorage.getAccessToken(),
          tokenStorage.getRefreshToken(),
        ]);

        if (!accessToken || !refreshToken) {
          await clearStoredTokens();
          clearRealtimeSession();

          set({
            user: null,
            isAuthenticated: false,
          });

          return;
        }

        // El interceptor renueva el token y reintenta el perfil ante un 401.
        const user = await authService.getProfile();

        set({
          user,
          isAuthenticated: true,
        });
      } catch (error) {
        console.log("No fue posible restaurar la sesión:", error);
        clearRealtimeSession();

        set({
          user: null,
          isAuthenticated: false,
        });
      } finally {
        set({ isInitializing: false });
      }
    })();

    initializationPromise = currentInitialization;

    try {
      await currentInitialization;
    } finally {
      if (initializationPromise === currentInitialization) {
        initializationPromise = null;
      }
    }
  },

  login: async (data) => {
    if (get().isInitializing || get().isSubmitting) {
      return;
    }

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
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });

      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  register: async (data) => {
    if (get().isInitializing || get().isSubmitting) {
      return;
    }

    set({
      isSubmitting: true,
      error: null,
    });

    try {
      const response = await authService.register(data);

      await tokenStorage.saveTokens(
        response.accessToken,
        response.refreshToken,
      );

      set({
        user: response.user,
        isAuthenticated: true,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });

      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  logout: async () => {
    if (get().isInitializing || get().isSubmitting) {
      return;
    }

    set({
      isSubmitting: true,
      error: null,
    });

    try {
      /*
       * Se ejecuta mientras el access token
       * todavía se encuentra disponible.
       */
      try {
        await unregisterCurrentDevicePushToken();
      } catch (error) {
        console.log("No fue posible desregistrar el token push:", error);
      }

      /*
       * Después se cierra la sesión del backend
       * usando el refresh token.
       */
      try {
        const refreshToken = await tokenStorage.getRefreshToken();

        if (refreshToken) {
          await authService.logout(refreshToken);
        }
      } catch (error) {
        console.log("No fue posible cerrar la sesión en el servidor:", error);
      }
    } finally {
      /*
       * Finalmente se desconecta el socket,
       * se limpian las notificaciones y eliminamos
       * las credenciales locales.
       */
      clearRealtimeSession();

      await clearStoredTokens();

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
