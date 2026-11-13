"use client";

import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  AUTH_ME_QUERY_KEY,
  getCurrentUser,
} from "@/features/auth/api";
import { authStore } from "@/features/auth/store";
import { getApiErrorStatus } from "@/lib/api/api-error";

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const sessionQuery = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (sessionQuery.isSuccess) {
      authStore.getState().setUser(sessionQuery.data);
    } else if (sessionQuery.isError) {
      if (getApiErrorStatus(sessionQuery.error) === 401) {
        authStore.getState().setUnauthenticated();
      } else {
        authStore.getState().setSessionError();
      }
    }
  }, [
    sessionQuery.data,
    sessionQuery.error,
    sessionQuery.isError,
    sessionQuery.isSuccess,
  ]);

  return children;
}
