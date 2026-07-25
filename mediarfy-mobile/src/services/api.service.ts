import {
  AxiosError,
  create,
  InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import { tokenStorage } from './token-storage.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'La variable EXPO_PUBLIC_API_URL no está configurada',
  );
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const api = create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/*
 * Cliente separado para renovar la sesión.
 * Así evitamos que el interceptor se llame a sí mismo.
 */
const refreshApi = create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string> | null = null;

async function renewAccessToken(): Promise<string> {
  const storedRefreshToken =
    await tokenStorage.getRefreshToken();

  if (!storedRefreshToken) {
    throw new Error('No existe un refresh token');
  }

  const response = await refreshApi.post<RefreshResponse>(
    '/auth/refresh',
    {
      refreshToken: storedRefreshToken,
    },
  );

  await tokenStorage.saveTokens(
    response.data.accessToken,
    response.data.refreshToken,
  );

  return response.data.accessToken;
}

api.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const accessToken =
      await tokenStorage.getAccessToken();

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },
  async (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetryableRequest | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    /*
     * No intentamos renovar si el error vino del login,
     * registro, refresh o logout.
     */
    const requestUrl = originalRequest.url ?? '';

    const ignoredRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/logout',
    ];

    if (
      ignoredRoutes.some((route) =>
        requestUrl.includes(route),
      )
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Si varias peticiones reciben 401 al mismo tiempo,
       * todas esperan una sola renovación.
       */
      if (!refreshPromise) {
        refreshPromise = renewAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      if (
        isAxiosError(refreshError) &&
        refreshError.response &&
        [400, 401, 403].includes(refreshError.response.status)
      ) {
        try {
          await tokenStorage.clearTokens();
        } catch (storageError) {
          console.log(
            'No fue posible eliminar los tokens rechazados:',
            storageError,
          );
        }
      }

      return Promise.reject(refreshError);
    }
  },
);
