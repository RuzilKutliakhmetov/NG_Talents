"use client";

import Link from "next/link";
import { useShallow } from "zustand/react/shallow";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authStore } from "@/features/auth/store";
import { cn } from "cn";

export function CandidateHome() {
  const firstName = authStore(useShallow((state) => state.user?.firstName));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {firstName ? `Здравствуйте, ${firstName}!` : "Кабинет кандидата"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Ищите предложения и отслеживайте отклики на вакансии.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Мои отклики</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Проверяйте статусы, историю и при необходимости отзывайте отклики.
          </p>
          <Link
            href="/candidate/applications"
            className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
          >
            Открыть отклики
          </Link>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Каталог вакансий</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Просматривайте актуальные опубликованные вакансии.
          </p>
          <Link
            href="/vacancies"
            className={cn(buttonVariants(), "mt-5")}
          >
            Найти вакансию
          </Link>
        </Card>
      </div>
    </main>
  );
}
