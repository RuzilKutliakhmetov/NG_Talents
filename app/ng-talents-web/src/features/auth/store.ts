import { create } from "zustand";

import type { ApiUser, UserRole } from "@/types/api";

export type SessionStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

interface AuthState {
  accessToken: string | null;
  user: ApiUser | null;
  status: SessionStatus;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: ApiUser) => void;
  setUnauthenticated: () => void;
  setSessionError: () => void;
  clearSession: () => void;
}

export const roleRouteMap: Record<UserRole, string> = {
  CANDIDATE: "/candidate",
  EMPLOYER: "/employer",
  ADMIN: "/admin",
  MODERATOR: "/moderator",
};

export const authStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "loading",
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user, status: "authenticated" }),
  setUnauthenticated: () =>
    set({ accessToken: null, user: null, status: "unauthenticated" }),
  setSessionError: () => set({ status: "error" }),
  clearSession: () =>
    set({ accessToken: null, user: null, status: "unauthenticated" }),
}));
