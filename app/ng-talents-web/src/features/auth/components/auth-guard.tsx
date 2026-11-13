"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { authStore, roleRouteMap } from "@/features/auth/store";
import type { UserRole } from "@/types/api";

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
  requiredRole?: UserRole;
  allowedRoles?: readonly UserRole[];
}

export function AuthGuard({
  children,
  redirectTo = "/login",
  requiredRole,
  allowedRoles,
}: AuthGuardProps) {
  const router = useRouter();
  const authState = authStore(useShallow((state) => ({
    status: state.status,
    user: state.user,
  })));

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.replace(redirectTo);
      return;
    }

    if (
      authState.status === "authenticated" &&
      authState.user &&
      ((requiredRole && authState.user.role !== requiredRole) ||
        (allowedRoles && !allowedRoles.includes(authState.user.role)))
    ) {
      router.replace(roleRouteMap[authState.user.role]);
    }
  }, [
    allowedRoles,
    authState.status,
    authState.user,
    redirectTo,
    requiredRole,
    router,
  ]);

  if (authState.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Проверка сессии...
      </main>
    );
  }

  if (authState.status === "unauthenticated") {
    return null;
  }

  if (authState.status === "error") {
    if (!requiredRole && !allowedRoles) return <>{children}</>;
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Не удалось проверить сессию. Обновите страницу или войдите снова.
      </main>
    );
  }

  if (
    authState.user &&
    ((requiredRole && authState.user.role !== requiredRole) ||
      (allowedRoles && !allowedRoles.includes(authState.user.role)))
  ) {
    return null;
  }

  return <>{children}</>;
}
