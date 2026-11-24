"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type EmployerApplicationQuery,
} from "@/features/applications/types";
import { useEmployerApplications } from "@/features/applications/hooks";
import { useEmployerId } from "@/features/employer/company-id";
import { authStore } from "@/features/auth/store";
import { formatApiError } from "@/features/employer/lib";
import { formatPublishedDate } from "@/features/vacancies/lib";
import { cn } from "cn";
import { useShallow } from "zustand/react/shallow";

const INITIAL_QUERY: EmployerApplicationQuery = {
  page: 1,
  limit: 20,
  sort: "appliedAt",
  direction: "desc",
};

export function EmployerApplicationsPage() {
  const userId = authStore(useShallow((state) => state.user?.id));
  const employerId = useEmployerId(userId);
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [vacancyFilter, setVacancyFilter] = useState("");
  const applicationsQuery = useEmployerApplications(employerId, query);

  if (!employerId) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Компания не подключена</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Подключите компанию, чтобы просматривать отклики на её вакансии.
          </p>
          <Link
            href="/employer/company"
            className={cn(buttonVariants(), "mt-4")}
          >
            Перейти к компании
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Отклики</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Здесь отображаются отклики только на вакансии подключённой компании.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Статус
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={query.status ?? ""}
            onChange={(event) => {
              const status = APPLICATION_STATUSES.find(
                (item) => item === event.target.value,
              );
              setQuery((current) => ({ ...current, page: 1, status }));
            }}
          >
            <option value="">Все статусы</option>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPLICATION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </header>
      <form
        className="mb-5 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          setQuery((current) => ({
            ...current,
            page: 1,
            vacancyId: vacancyFilter.trim() || undefined,
          }));
        }}
      >
        <label className="sr-only" htmlFor="employer-applications-vacancy">
          Фильтр по UUID вакансии
        </label>
        <input
          id="employer-applications-vacancy"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          value={vacancyFilter}
          onChange={(event) => setVacancyFilter(event.target.value)}
          placeholder="Фильтр по UUID вакансии"
          autoComplete="off"
        />
        <Button type="submit" variant="outline">
          Фильтровать по вакансии
        </Button>
      </form>

      {applicationsQuery.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : applicationsQuery.isError ? (
        <Card className="p-6" role="alert">
          <h2 className="text-lg font-semibold">Не удалось загрузить отклики</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatApiError(applicationsQuery.error)}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void applicationsQuery.refetch()}
          >
            Повторить
          </Button>
        </Card>
      ) : applicationsQuery.data.items.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">Откликов пока нет</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Для выбранного фильтра откликов не найдено.
          </p>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Всего: {applicationsQuery.data.pagination.total}
          </p>
          <div className="space-y-4">
            {applicationsQuery.data.items.map((application) => (
              <Card key={application.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {application.candidate.firstName}{" "}
                      {application.candidate.lastName}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {application.candidate.email ?? "Контакт скрыт"}
                    </p>
                    <p className="mt-2 text-sm">
                      Вакансия: {application.vacancy.title}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {APPLICATION_STATUS_LABELS[application.status]}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Получен {formatPublishedDate(application.appliedAt) ?? "—"}
                </p>
                <Link
                  href={`/employer/applications/${encodeURIComponent(application.id)}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
                >
                  Рассмотреть отклик
                </Link>
              </Card>
            ))}
          </div>
          {applicationsQuery.data.pagination.totalPages > 1 ? (
            <nav
              aria-label="Страницы откликов"
              className="mt-6 flex items-center justify-between border-t pt-4"
            >
              <p className="text-sm text-muted-foreground">
                Страница {applicationsQuery.data.pagination.page} из{" "}
                {applicationsQuery.data.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.page <= 1}
                  onClick={() =>
                    setQuery((current) => ({ ...current, page: current.page - 1 }))
                  }
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    query.page >= applicationsQuery.data.pagination.totalPages
                  }
                  onClick={() =>
                    setQuery((current) => ({ ...current, page: current.page + 1 }))
                  }
                >
                  Далее
                </Button>
              </div>
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}
