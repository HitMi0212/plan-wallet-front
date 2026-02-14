import axios, { AxiosError, AxiosInstance } from 'axios';

import { loadTokens, saveTokens, clearTokens } from './token';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:17500/plan';

let apiClient: AxiosInstance | null = null;

async function refreshToken(currentRefreshToken: string) {
  const response = await axios.post(`${baseURL}/auth/refresh`, {
    refreshToken: currentRefreshToken,
  });
  return response.data as { accessToken: string; refreshToken: string };
}

export function getApiClient() {
  if (apiClient) return apiClient;

  apiClient = axios.create({
    baseURL,
    timeout: 10000,
  });

  apiClient.interceptors.request.use(async (config) => {
    const { accessToken } = await loadTokens();
    if (accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config;
      if (!original || original.headers?.['x-retry']) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401) {
        const { refreshToken: storedRefresh } = await loadTokens();
        if (!storedRefresh) {
          await clearTokens();
          return Promise.reject(error);
        }

        try {
          const tokens = await refreshToken(storedRefresh);
          await saveTokens(tokens.accessToken, tokens.refreshToken);
          original.headers = {
            ...original.headers,
            Authorization: `Bearer ${tokens.accessToken}`,
            'x-retry': '1',
          };
          return apiClient!(original);
        } catch (refreshError) {
          await clearTokens();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
}
