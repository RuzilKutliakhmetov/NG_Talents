"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authStore } from "@/features/auth/store";
import {
  formatPublishedDate,
  formatSalary,
  getEmploymentLabel,
  getRegionLabel,
} from "@/features/vacancies/lib";
import { formatApiError } from "@/features/employer/lib";

import { useEmployerId } from "../company-id";
import { useManagedVacancies } from "../hooks";
import type { ManagedVacancy, VacancyManagementQuery } from "../types";
import { VACANCY_STATUSES } from "../types";
import { EmployerPageContainer } from "./employer-company-page";
import { VacancyActions } from "./vacancy-actions";

const STATUS_LABELS: Record<(typeof VACANCY_STATUSES)[number], string> = {
  DRAFT: "Черновик",
  PENDING_MODERATION: "Ожидает модерации",
  MODERATION: "На модерации",
  PUBLISHED: "Опубликована",
  PAUSED: "Приостановлена",
  CLOSED: "Закрыта",
  REJECTED: "Отклонена",
  ARCHIVED: "В архиве",
};

const INITIAL_QUERY: VacancyManagementQuery = {
  page: 1,
  limit: 20,
  sort: "createdAt",
  direction: "desc",
};

export function ManagedVacanciesPage() {
  const router = useRouter();
  const userId = authStore(useShallow((state) => state.user?.id));
  const employerId = useEmployerId(userId);
  const [query, setQuery] = useState(INITIAL_QUERY);
  const vacanciesQuery = useManagedVacancies(employerId, query);

  return (
    <EmployerPageContainer title="Вакансии">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Создавайте предложения, отправляйте их на модерацию и управляйте
          статусом публикации.
        </p>
        <Button
          disabled={!employerId}
          onClick={() => router.push("/employer/vacancies/new")}
        >
          Создать вакансию
        </Button>
      </header>

      {!employerId ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Сначала подключите компанию</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Backend требует employer UUID для операций с вакансиями.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/employer/company")}
          >
            Перейти к профилю компании
          </Button>
        </Card>
      ) : vacanciesQuery.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : vacanciesQuery.isError ? (
        <Card className="p-6" role="alert">
          <h2 className="text-lg font-semibold">Не удалось загрузить вакансии</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatApiError(vacanciesQuery.error)}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void vacanciesQuery.refetch()}
          >
            Повторить
          </Button>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Всего вакансий: {vacanciesQuery.data.meta.total}
            </p>
            <label className="flex items-center gap-2 text-sm">
              Статус
              <select
                className="h-9 rounded-md border border-input bg-background px-3"
                value={query.status ?? ""}
                onChange={(event) =>
                  setQuery({
                    ...query,
                    page: 1,
                    status: event.target.value
                      ? (event.target.value as VacancyManagementQuery["status"])
                      : undefined,
                  })
                }
              >
                <option value="">Все статусы</option>
                {VACANCY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {vacanciesQuery.data.items.length === 0 ? (
            <Card className="p-8 text-center">
              <h2 className="text-lg font-semibold">Вакансий пока нет</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Создайте первую вакансию компании.
              </p>
              <Button
                className="mt-5"
                onClick={() => router.push("/employer/vacancies/new")}
              >
                Создать вакансию
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {vacanciesQuery.data.items.map((vacancy) => (
                <ManagedVacancyCard
                  key={vacancy.id}
                  vacancy={vacancy}
                  employerId={employerId}
                  onEdit={() =>
                    router.push(`/employer/vacancies/${vacancy.id}/edit`)
                  }
                  onView={() =>
                    router.push(`/vacancies/${vacancy.id}`)
                  }
                />
              ))}
            </div>
          )}

          {vacanciesQuery.data.meta.totalPages > 1 ? (
            <nav
              aria-label="Страницы вакансий работодателя"
              className="mt-6 flex items-center justify-between border-t pt-4"
            >
              <p className="text-sm text-muted-foreground">
                Страница {vacanciesQuery.data.meta.page} из{" "}
                {vacanciesQuery.data.meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.page <= 1}
                  onClick={() =>
                    setQuery({ ...query, page: Math.max(1, query.page - 1) })
                  }
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={query.page >= vacanciesQuery.data.meta.totalPages}
                  onClick={() =>
                    setQuery({
                      ...query,
                      page: Math.min(
                        vacanciesQuery.data.meta.totalPages,
                        query.page + 1,
                      ),
                    })
                  }
                >
                  Далее
                </Button>
              </div>
            </nav>
          ) : null}
        </>
      )}
    </EmployerPageContainer>
  );
}

function ManagedVacancyCard({
  vacancy,
  employerId,
  onEdit,
  onView,
}: {
  vacancy: ManagedVacancy;
  employerId: string;
  onEdit: () => void;
  onView: () => void;
}) {
  const statusLabel =
    STATUS_LABELS[vacancy.status] ?? "Неизвестный статус";
  const publishedAt = formatPublishedDate(vacancy.publishedAt);
  const createdAt = formatPublishedDate(vacancy.createdAt);
  const location = [vacancy.locationCity, getRegionLabel(vacancy.locationRegion)]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{vacancy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {vacancy.employmentType
              ? getEmploymentLabel(vacancy.employmentType)
              : undefined}
            {location ? ` · ${location}` : ""}
          </p>
        </div>
        <Badge variant={vacancy.status === "PUBLISHED" ? "default" : "secondary"}>
          {statusLabel}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <span>
          {formatSalary(vacancy.salaryMin, vacancy.salaryMax, vacancy.currency)}
        </span>
        {createdAt ? (
          <span className="text-muted-foreground">Создана {createdAt}</span>
        ) : null}
        {publishedAt ? (
          <span className="text-muted-foreground">
            Опубликована {publishedAt}
          </span>
        ) : null}
      </div>
      <p className="break-all border-t pt-3 font-mono text-xs text-muted-foreground">
        ID компании: {employerId} · ID вакансии: {vacancy.id}
      </p>
      {vacancy.moderationComment ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Комментарий модерации: {vacancy.moderationComment}
        </p>
      ) : null}
      {vacancy.status === "PENDING_MODERATION" ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Вакансия отправлена на проверку и ожидает решения модератора.
        </p>
      ) : vacancy.status === "MODERATION" ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Вакансия сейчас проверяется модератором.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        {vacancy.status === "PUBLISHED" ? (
          <Button size="sm" variant="outline" onClick={onView}>
            Открыть публичную страницу
          </Button>
        ) : null}
        {vacancy.status !== "PUBLISHED" && vacancy.status !== "PAUSED" ? (
          <Button size="sm" variant="outline" onClick={onEdit}>
            Редактировать
          </Button>
        ) : null}
        <VacancyActions vacancy={vacancy} employerId={employerId} />
      </div>
    </Card>
  );
}
