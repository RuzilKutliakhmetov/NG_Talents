"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { authStore, roleRouteMap } from "@/features/auth/store";

export default function Home() {
  const router = useRouter();
  const authState = authStore(useShallow((state) => ({
    status: state.status,
    user: state.user,
  })));

  useEffect(() => {
    if (authState.status === "authenticated" && authState.user) {
      router.replace(roleRouteMap[authState.user.role]);
    }
  }, [authState.status, authState.user, router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full max-w-3xl rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
        <div className="mb-8 inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
          NG Talents
        </div>
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold tracking-wide text-primary">
            Работа и возможности
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Основа платформы для поиска работы и сотрудников
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Здесь появятся вакансии, профили кандидатов и инструменты для
            работодателей. Сейчас подготовлена базовая инфраструктура
            приложения и авторизации.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => router.push("/vacancies")}>
            Смотреть вакансии
          </Button>
          <Button onClick={() => router.push("/login")}>Войти</Button>
          <Button variant="outline" onClick={() => router.push("/register")}>
            Регистрация
          </Button>
        </div>
        <div className="mt-10 grid gap-4 border-t pt-6 text-sm sm:grid-cols-2">
          <div>
            <h2 className="font-medium">Кандидатам</h2>
            <p className="mt-1 text-muted-foreground">
              Профиль, поиск вакансий и отклики.
            </p>
          </div>
          <div>
            <h2 className="font-medium">Работодателям</h2>
            <p className="mt-1 text-muted-foreground">
              Компании, вакансии и работа с откликами.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
