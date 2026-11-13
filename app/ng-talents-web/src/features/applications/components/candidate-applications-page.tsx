"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type CandidateApplicationQuery,
} from "@/features/applications/types";
import {
  useCandidateApplications,
  useWithdrawCandidateApplication,
} from "@/features/applications/hooks";
import { formatApiError } from "@/features/employer/lib";
import { formatPublishedDate } from "@/features/vacancies/lib";
import { normalizeApiError } from "@/lib/api/api-error";
import { cn } from "cn";

const INITIAL_QUERY: CandidateApplicationQuery = {
  page: 1,
  limit: 20,
  sort: "appliedAt",
  direction: "desc",
};

export function CandidateApplicationsPage() {
  const [query, setQuery] = useState(INITIAL_QUERY);
  const applicationsQuery = useCandidateApplications(query);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Мои отклики</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Список загружается для текущего кандидата с сервера.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Статус
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={query.status ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              const status = APPLICATION_STATUSES.find(
                (candidateStatus) => candidateStatus === value,
              );
              setQuery((current) => ({
                ...current,
                page: 1,
                status,
              }));
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

      {applicationsQuery.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
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
            Найдите подходящую вакансию и отправьте первый отклик.
          </p>
          <Link
            href="/vacancies"
            className={cn(buttonVariants(), "mt-5")}
          >
            Перейти в каталог
          </Link>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Всего: {applicationsQuery.data.pagination.total}
          </p>
          <div className="space-y-4">
            {applicationsQuery.data.items.map((application) => (
              <CandidateApplicationCard
                key={application.id}
                application={application}
              />
            ))}
          </div>
          {applicationsQuery.data.pagination.totalPages > 1 ? (
            <nav
              aria-label="Страницы моих откликов"
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
                    setQuery((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
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
                    setQuery((current) => ({
                      ...current,
                      page: current.page + 1,
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

function CandidateApplicationCard({
  application,
}: {
  application: import("@/features/applications/types").CandidateApplication;
}) {
  const withdrawMutation = useWithdrawCandidateApplication(application.id);
  const vacancyIsPublic = application.vacancy.status === "PUBLISHED";
  const canWithdraw = !["HIRED", "REJECTED", "WITHDRAWN"].includes(
    application.status,
  );
  const employer =
    application.vacancy.employer.shortName ||
    application.vacancy.employer.legalName;

  const withdraw = async () => {
    if (!window.confirm("Отозвать отклик? Это действие нельзя отменить.")) {
      return;
    }
    try {
      const updated = await withdrawMutation.mutateAsync();
      toast.success(
        `Отклик отозван. Статус: ${APPLICATION_STATUS_LABELS[updated.status]}.`,
      );
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{application.vacancy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{employer}</p>
        </div>
        <Badge variant="secondary">
          {APPLICATION_STATUS_LABELS[application.status]}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span>Отклик отправлен {formatPublishedDate(application.appliedAt) ?? "—"}</span>
        <span>Обновлён {formatPublishedDate(application.updatedAt) ?? "—"}</span>
        {application.resume ? <span>Резюме: {application.resume.title}</span> : null}
      </div>
      {application.coverLetter ? (
        <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm">
          {application.coverLetter}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Link
          href={`/candidate/applications/${encodeURIComponent(application.id)}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Подробнее и история
        </Link>
        {vacancyIsPublic ? (
          <Link
            href={`/vacancies/${encodeURIComponent(application.vacancyId)}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Открыть вакансию
          </Link>
        ) : (
          <span className="self-center text-xs text-muted-foreground">
            Вакансия больше не опубликована
          </span>
        )}
        {canWithdraw ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={withdrawMutation.isPending}
            onClick={() => void withdraw()}
          >
            {withdrawMutation.isPending ? "Отзываем..." : "Отозвать"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
