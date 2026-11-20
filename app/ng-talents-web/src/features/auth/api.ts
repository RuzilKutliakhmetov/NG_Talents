import { apiClient } from "@/lib/api/client";
import { queryClient } from "@/lib/query/client";
import { authStore } from "@/features/auth/store";
import type { ApiUser, AuthTokenResponse } from "@/types/api";

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
}

export async function getCurrentUser(): Promise<ApiUser> {
  const { data } = await apiClient.get<ApiUser>("/auth/me");
  return data;
}

export async function register(input: RegisterInput): Promise<ApiUser> {
  const { data } = await apiClient.post<ApiUser>("/auth/register", input);
  return data;
}

export async function login(input: LoginInput): Promise<ApiUser> {
  const { data } = await apiClient.post<AuthTokenResponse>("/auth/login", input);
  authStore.getState().setAccessToken(data.accessToken);

  try {
    const user = await getCurrentUser();
    authStore.getState().setUser(user);
    return user;
  } catch (error) {
    authStore.getState().clearSession();
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<{ success: true }>("/auth/logout");
  } finally {
    queryClient.clear();
    authStore.getState().clearSession();
  }
}

export async function logoutAll(): Promise<void> {
  try {
    await apiClient.post<{ success: true }>("/auth/logout-all");
  } finally {
    queryClient.clear();
    authStore.getState().clearSession();
  }
}

export async function refreshSessionAccessToken(
  expectedUserId: string,
): Promise<string | null> {
  try {
    const { data } = await apiClient.post<AuthTokenResponse>("/auth/refresh");
    const currentUserId = authStore.getState().user?.id;
    if (currentUserId !== expectedUserId) return null;

    authStore.getState().setAccessToken(data.accessToken);
    return data.accessToken;
  } catch (error) {
    if (authStore.getState().user?.id === expectedUserId) {
      queryClient.clear();
      authStore.getState().clearSession();
    }
    throw error;
  }
}
