"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPLICATION_STATUS_LABELS,
} from "@/features/applications/types";
import {
  useCandidateApplication,
  useCandidateApplicationHistory,
} from "@/features/applications/hooks";
import { formatApiError } from "@/features/employer/lib";
import { formatPublishedDate } from "@/features/vacancies/lib";
import { cn } from "cn";

export function CandidateApplicationDetailPage({ id }: { id: string }) {
  const applicationQuery = useCandidateApplication(id);
  const historyQuery = useCandidateApplicationHistory(id);

  if (applicationQuery.isPending) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </main>
    );
  }

  if (applicationQuery.isError) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Card className="p-6" role="alert">
          <h1 className="text-xl font-semibold">Не удалось загрузить отклик</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatApiError(applicationQuery.error)}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void applicationQuery.refetch()}
          >
            Повторить
          </Button>
        </Card>
      </main>
    );
  }

  const application = applicationQuery.data;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-8 sm:px-6">
      <Link
        href="/candidate/applications"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        К моим откликам
      </Link>
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{application.vacancy.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Данные о работодателе не предоставляются в этом ответе API.
            </p>
          </div>
          <Badge variant="secondary">
            {APPLICATION_STATUS_LABELS[application.status]}
          </Badge>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Info label="Дата отклика" value={formatDate(application.appliedAt)} />
          <Info label="Последнее обновление" value={formatDate(application.updatedAt)} />
          <Info label="Резюме" value={application.resume?.title ?? "Не прикреплено"} />
          <Info label="Отклик ID" value={application.id} />
        </dl>
        <TextSection title="Сопроводительное письмо" text={application.coverLetter} />
        <TextSection title="Дополнительная информация" text={application.candidateComment} />
        {application.vacancy.status === "PUBLISHED" ? (
          <Link
            href={`/vacancies/${encodeURIComponent(application.vacancyId)}`}
            className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
          >
            Открыть вакансию
          </Link>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Вакансия больше не опубликована. Сведения об отклике доступны здесь.
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">История статусов</h2>
        {historyQuery.isPending ? (
          <Skeleton className="mt-4 h-24 rounded-xl" />
        ) : historyQuery.isError ? (
          <div className="mt-4" role="alert">
            <p className="text-sm text-muted-foreground">
              {formatApiError(historyQuery.error)}
            </p>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={() => void historyQuery.refetch()}
            >
              Повторить
            </Button>
          </div>
        ) : historyQuery.data.length ? (
          <ol className="mt-4 space-y-3">
            {historyQuery.data.map((entry) => (
              <li key={entry.id} className="rounded-md border p-3">
                <p className="font-medium">
                  {entry.fromStatus
                    ? `${APPLICATION_STATUS_LABELS[entry.fromStatus]} → `
                    : ""}
                  {APPLICATION_STATUS_LABELS[entry.toStatus]}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.actor
                    ? `${entry.actor.firstName} ${entry.actor.lastName} · ${entry.actor.role}`
                    : entry.actorRole}{" "}
                  · {formatDate(entry.createdAt)}
                </p>
                {entry.comment ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {entry.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            История пока пуста.
          </p>
        )}
      </Card>
    </main>
  );
}

function formatDate(value: string) {
  return formatPublishedDate(value) ?? "—";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value}</dd>
    </div>
  );
}

function TextSection({ title, text }: { title: string; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section className="mt-5 border-t pt-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{text}</p>
    </section>
  );
}
