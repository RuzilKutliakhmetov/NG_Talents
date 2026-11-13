import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import { authStore } from "@/features/auth/store";
import type { AuthTokenResponse } from "@/types/api";

type RetriableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

if (!apiBaseUrl) {
  throw new Error("Не задана переменная окружения NEXT_PUBLIC_API_URL.");
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

function isPublicAuthEndpoint(url: string | undefined): boolean {
  const path = url?.split("?")[0]?.replace(/\/+$/, "") ?? "";

  return ["/auth/login", "/auth/register", "/auth/refresh"].some((endpoint) =>
    path.endsWith(endpoint),
  );
}

function attachAccessToken(config: InternalAxiosRequestConfig): void {
  if (isPublicAuthEndpoint(config.url)) {
    config.headers.delete("Authorization");
    return;
  }

  const accessToken = authStore.getState().accessToken;

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    config.headers.delete("Authorization");
  }
}

let refreshRequest: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = apiClient
        .post<AuthTokenResponse>("/auth/refresh")
      .then(({ data }) => {
        authStore.getState().setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch((error: unknown) => {
        authStore.getState().clearSession();
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

apiClient.interceptors.request.use((config) => {
  attachAccessToken(config);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const request = error.config as
      | RetriableRequestConfig
      | undefined;

    if (
      error.response?.status !== 401 ||
      !request ||
      isPublicAuthEndpoint(request.url)
    ) {
      return Promise.reject(error);
    }

    if (request._retry) {
      authStore.getState().clearSession();
      return Promise.reject(error);
    }

    request._retry = true;

    try {
      await refreshAccessToken();
      return apiClient(request);
    } catch {
      return Promise.reject(error);
    }
  },
);
