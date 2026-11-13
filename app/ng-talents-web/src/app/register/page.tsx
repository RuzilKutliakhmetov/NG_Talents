"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { authStore } from "@/features/auth/store";
import { getLoginRedirectRoute } from "@/features/applications/lib";

export default function RegisterPage() {
  const router = useRouter();
  const authState = authStore(useShallow((state) => ({
    status: state.status,
    user: state.user,
  })));

  useEffect(() => {
    if (authState.status === "authenticated" && authState.user) {
      router.replace(
        getLoginRedirectRoute(
          authState.user.role,
          window.location.search,
        ),
      );
    }
  }, [authState.status, authState.user, router]);

  if (authState.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Проверка сессии...
      </main>
    );
  }

  return (
    <AuthShell
      title="Регистрация"
      description="Создайте аккаунт для кандидата или работодателя."
    >
      <RegisterForm />
    </AuthShell>
  );
}
