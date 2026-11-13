"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "cn";

export function ModeratorHome() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Обзор модерации</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        Здесь доступны проверка вакансии, решение по статусу и история
        модерации. Backend пока не предоставляет агрегаты для сводной
        статистики, поэтому показатели не отображаются.
      </p>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold">Очередь модерации</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Просматривайте все вакансии, ожидающие проверки или уже взятые
          модератором в работу. Решения и допустимость переходов проверяет
          backend.
        </p>
        <Link
          href="/moderator/vacancies"
          className={cn(buttonVariants(), "mt-5")}
        >
          Открыть очередь
        </Link>
      </Card>
    </main>
  );
}
