"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatPublishedDate,
  formatSalary,
  getEmploymentLabel,
  getRegionLabel,
  getWorkFormatLabel,
} from "@/features/vacancies/lib";
import { normalizeApiError } from "@/lib/api/api-error";
import type { VacancyStatus } from "@/types/api";

import { useModerationQueue } from "../hooks";
import type { ModerationQueueQuery } from "../types";

const PAGE_SIZE = 20;

const STATUS_LABELS = {
  PENDING_MODERATION: "Ожидает проверки",
  MODERATION: "На проверке",
} as const;

type QueueStatus = NonNullable<ModerationQueueQuery["status"]>;

function isQueueStatus(status: VacancyStatus): status is QueueStatus {
  return status === "PENDING_MODERATION" || status === "MODERATION";
}

const EMPTY_QUERY: ModerationQueueQuery = {
  page: 1,
  limit: PAGE_SIZE,
};

export function ModerationQueuePage() {
  const router = useRouter();
  const [query, setQuery] = useState<ModerationQueueQuery>(EMPTY_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const queueQuery = useModerationQueue(query);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery((current) => ({
      ...current,
      page: 1,
      search: searchInput.trim() || undefined,
    }));
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Очередь вакансий на модерации
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Отображаются вакансии со статусами «Ожидает проверки» и «На проверке».
          Список, поиск и пагинация загружаются с backend.
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <form
          className="flex flex-1 gap-2"
          onSubmit={submitSearch}
          role="search"
        >
          <label className="sr-only" htmlFor="moderation-queue-search">
            Поиск по вакансии или компании
          </label>
          <Input
            id="moderation-queue-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Поиск по вакансии или компании"
            maxLength={200}
          />
          <Button type="submit" variant="outline">
            Найти
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          Статус
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={query.status ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              const status: QueueStatus | undefined =
                value === "PENDING_MODERATION" || value === "MODERATION"
                  ? value
                  : undefined;
              setQuery((current) => ({
                ...current,
                page: 1,
                status,
              }));
            }}
          >
            <option value="">Все статусы очереди</option>
            <option value="PENDING_MODERATION">
              {STATUS_LABELS.PENDING_MODERATION}
            </option>
            <option value="MODERATION">{STATUS_LABELS.MODERATION}</option>
          </select>
        </label>
      </div>

      {queueQuery.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : queueQuery.isError ? (
        <Card className="p-6" role="alert">
          <h2 className="text-lg font-semibold">
            Не удалось загрузить очередь
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {normalizeApiError(queueQuery.error).message}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void queueQuery.refetch()}
          >
            Повторить
          </Button>
        </Card>
      ) : queueQuery.data.items.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">
            Вакансий на модерации нет
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Попробуйте изменить поиск или статус. Список отражает записи,
            возвращённые backend.
          </p>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Всего в выборке: {queueQuery.data.meta.total}
          </p>
          <div className="space-y-4">
            {queueQuery.data.items.map((vacancy) => {
              const location = [
                vacancy.locationCity,
                getRegionLabel(vacancy.locationRegion),
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <Card key={vacancy.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {vacancy.title}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {vacancy.employer.shortName ||
                          vacancy.employer.legalName}
                      </p>
                    </div>
                    {isQueueStatus(vacancy.status) ? (
                      <Badge variant="secondary">
                        {STATUS_LABELS[vacancy.status]}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <span>
                      {formatSalary(
                        vacancy.salaryMin,
                        vacancy.salaryMax,
                        vacancy.currency,
                      )}
                    </span>
                    {getEmploymentLabel(vacancy.employmentType) ? (
                      <span>
                        {getEmploymentLabel(vacancy.employmentType)}
                      </span>
                    ) : null}
                    {getWorkFormatLabel(vacancy.workFormat) ? (
                      <span>{getWorkFormatLabel(vacancy.workFormat)}</span>
                    ) : null}
                    {location ? <span>{location}</span> : null}
                    {formatPublishedDate(vacancy.createdAt) ? (
                      <span className="text-muted-foreground">
                        Создана {formatPublishedDate(vacancy.createdAt)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <Button
                      onClick={() =>
                        router.push(
                          `/moderator/vacancies/${encodeURIComponent(vacancy.id)}?employerId=${encodeURIComponent(vacancy.employerId)}`,
                        )
                      }
                    >
                      Проверить вакансию
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {queueQuery.data.meta.totalPages > 1 ? (
            <nav
              aria-label="Страницы очереди модерации"
              className="mt-6 flex items-center justify-between border-t pt-4"
            >
              <p className="text-sm text-muted-foreground">
                Страница {queueQuery.data.meta.page} из{" "}
                {queueQuery.data.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.page <= 1}
                  onClick={() =>
                    setQuery((current) => ({
                      ...current,
                      page: Math.max(1, current.page - 1),
                    }))
                  }
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.page >= queueQuery.data.meta.totalPages}
                  onClick={() =>
                    setQuery((current) => ({
                      ...current,
                      page: Math.min(
                        queueQuery.data.meta.totalPages,
                        current.page + 1,
                      ),
                    }))
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
