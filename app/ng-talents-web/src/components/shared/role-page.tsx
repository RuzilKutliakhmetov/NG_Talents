"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/api";
import { authStore } from "@/features/auth/store";
import type { UserRole } from "@/types/api";

const roleTitles: Record<UserRole, string> = {
  CANDIDATE: "Кандидат",
  EMPLOYER: "Работодатель",
  ADMIN: "Администратор",
  MODERATOR: "Модератор",
};

const roleCopy: Record<UserRole, string> = {
  CANDIDATE: "Подготовка профиля кандидата, поиск вакансий и отслеживание откликов.",
  EMPLOYER: "Подготовка компаний, вакансий и управление заявками от кандидатов.",
  ADMIN: "Управление платформой, пользователями и операциями модерации.",
  MODERATOR: "Проверка вакансий, статусов и аудит активностей в системе.",
};

interface RolePageProps {
  role: UserRole;
}

export function RolePage({ role }: RolePageProps) {
  const router = useRouter();
  const authState = authStore(useShallow((state) => ({
    status: state.status,
    user: state.user,
  })));

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (authState.status === "authenticated" && authState.user && authState.user.role !== role) {
      router.replace(`/${authState.user.role.toLowerCase()}`);
    }
  }, [authState.status, authState.user, role, router]);

  const status = authState.status;

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">
        Проверка сессии...
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Не удалось восстановить сессию</h1>
          <p className="mt-2 text-muted-foreground">
            Попробуйте войти в систему заново.
          </p>
          <Button className="mt-4" onClick={() => router.push("/login")}>
            Войти
          </Button>
        </div>
      </main>
    );
  }

  const user = authState.user;

  if (status === "authenticated" && !user) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {roleTitles[role]}
        </p>
        <h1 className="mt-4 text-3xl font-semibold">
          Здравствуйте, {user?.firstName ?? "пользователь"}!
        </h1>
        <p className="mt-4 text-base text-muted-foreground">{roleCopy[role]}</p>
        <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm">
          <span className="font-medium">Роль:</span> {roleTitles[role]}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {role === "ADMIN" ? (
            <Button onClick={() => router.push("/moderator")}>
              Модерация вакансий
            </Button>
          ) : null}
          <Button onClick={async () => {
            try {
              await logout();
              router.replace("/login");
            } catch {
              router.replace("/login");
            }
          }}>Выйти</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            К стартовой странице
          </Button>
        </div>
      </div>
    </main>
  );
}
