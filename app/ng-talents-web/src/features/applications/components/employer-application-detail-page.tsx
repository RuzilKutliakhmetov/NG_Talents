"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  EMPLOYER_STATUS_TRANSITIONS,
  type ApplicationStatus,
} from "@/features/applications/types";
import {
  useEmployerApplication,
  useEmployerApplicationHistory,
  useEmployerApplicationResume,
  useMarkEmployerApplicationViewed,
  useUpdateEmployerApplicationComment,
  useUpdateEmployerApplicationStatus,
} from "@/features/applications/hooks";
import { useEmployerId } from "@/features/employer/company-id";
import { formatApiError } from "@/features/employer/lib";
import { formatPublishedDate } from "@/features/vacancies/lib";
import { normalizeApiError } from "@/lib/api/api-error";
import { authStore } from "@/features/auth/store";
import { cn } from "cn";

export function EmployerApplicationDetailPage({
  applicationId,
}: {
  applicationId: string;
}) {
  const userId = authStore(useShallow((state) => state.user?.id));
  const employerId = useEmployerId(userId);
  const applicationQuery = useEmployerApplication(employerId, applicationId);
  const historyQuery = useEmployerApplicationHistory(
    employerId ?? "",
    applicationId,
  );
  const resumeQuery = useEmployerApplicationResume(
    employerId ?? "",
    applicationId,
  );
  const markViewedMutation = useMarkEmployerApplicationViewed(
    employerId ?? "",
    applicationId,
  );
  const statusMutation = useUpdateEmployerApplicationStatus(
    employerId ?? "",
    applicationId,
  );
  const commentMutation = useUpdateEmployerApplicationComment(
    employerId ?? "",
    applicationId,
  );
  const [nextStatus, setNextStatus] = useState<ApplicationStatus | "">("");
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  if (!employerId) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Card className="p-6" role="alert">
          Подключите компанию, чтобы открыть её отклик.
        </Card>
      </main>
    );
  }

  if (applicationQuery.isPending) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
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
  const allowedStatuses = EMPLOYER_STATUS_TRANSITIONS[application.status];
  const isWorking =
    markViewedMutation.isPending ||
    statusMutation.isPending ||
    commentMutation.isPending;

  const markViewed = async () => {
    setActionError(null);
    try {
      const updated = await markViewedMutation.mutateAsync();
      if (updated.status === "VIEWED") {
        toast.success("Отклик отмечен просмотренным.");
      } else {
        toast.info(
          `Статус уже изменён: ${APPLICATION_STATUS_LABELS[updated.status]}.`,
        );
      }
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    }
  };

  const updateStatus = async () => {
    if (!nextStatus) return;
    if (
      ["HIRED", "REJECTED"].includes(nextStatus) &&
      !window.confirm(
        `Изменить статус отклика на «${APPLICATION_STATUS_LABELS[nextStatus]}»?`,
      )
    ) {
      return;
    }
    setActionError(null);
    try {
      const updated = await statusMutation.mutateAsync({
        status: nextStatus,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setNextStatus("");
      setComment("");
      toast.success(
        `Статус изменён: ${APPLICATION_STATUS_LABELS[updated.status]}.`,
      );
    } catch (error) {
      setActionError(normalizeApiError(error).message);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-8 sm:px-6">
      <Link
        href="/employer/applications"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        К откликам
      </Link>
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {application.candidate.firstName} {application.candidate.lastName}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {application.candidate.email ?? "Контакт скрыт"}
            </p>
            <p className="mt-3 text-sm">
              Вакансия: {application.vacancy.title}
            </p>
          </div>
          <Badge variant="secondary">
            {APPLICATION_STATUS_LABELS[application.status]}
          </Badge>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Info
            label="Дата отклика"
            value={formatPublishedDate(application.appliedAt) ?? "—"}
          />
          <Info
            label="Последнее обновление"
            value={formatPublishedDate(application.updatedAt) ?? "—"}
          />
          <Info
            label="Просмотрен"
            value={formatPublishedDate(application.viewedAt) ?? "Не отмечен"}
          />
        </dl>
        <TextBlock
          title="Сопроводительное письмо"
          text={application.coverLetter}
        />
        <TextBlock
          title="Дополнительная информация"
          text={application.candidateComment}
        />
        <InternalCommentEditor
          savedComment={application.employerComment}
          disabled={commentMutation.isPending}
          onSave={async (value) => {
            await commentMutation.mutateAsync(value);
            toast.success("Внутренний комментарий сохранён.");
          }}
        />
        {application.resume ? (
          <p className="mt-4 text-sm">
            Профессия в резюме:{" "}
            <strong>
              {application.resume.desiredPosition || "Не указана"}
            </strong>
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            К отклику резюме не прикреплено.
          </p>
        )}
      </Card>

      {application.resume ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Резюме кандидата</h2>
          {resumeQuery.isPending ? (
            <Skeleton className="mt-4 h-32 rounded-xl" />
          ) : resumeQuery.isError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {normalizeApiError(resumeQuery.error).message}
            </p>
          ) : (
            <ResumeSnapshot snapshot={resumeQuery.data.resumeSnapshot} />
          )}
        </Card>
      ) : null}

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Рассмотрение</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {application.status === "NEW" ? (
            <Button
              variant="outline"
              disabled={isWorking}
              onClick={() => void markViewed()}
            >
              {markViewedMutation.isPending
                ? "Обновляем..."
                : "Отметить просмотренным"}
            </Button>
          ) : null}
        </div>
        {allowedStatuses.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto]">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Следующий статус</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3"
                value={nextStatus}
                onChange={(event) => {
                  const status = APPLICATION_STATUSES.find(
                    (candidateStatus) => candidateStatus === event.target.value,
                  );
                  setNextStatus(
                    status && allowedStatuses.includes(status) ? status : "",
                  );
                }}
              >
                <option value="">Выберите действие</option>
                {allowedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {APPLICATION_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">
                Комментарий к изменению (необязательно)
              </span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3"
                value={comment}
                maxLength={1000}
                onChange={(event) => setComment(event.target.value)}
                disabled={isWorking}
              />
            </label>
            <Button
              className="self-end"
              disabled={!nextStatus || isWorking}
              onClick={() => void updateStatus()}
            >
              {statusMutation.isPending ? "Сохраняем..." : "Изменить статус"}
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Для текущего статуса нет дальнейших разрешённых переходов.
          </p>
        )}
        {actionError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {actionError}
          </p>
        ) : null}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">История статусов</h2>
        {historyQuery.isPending ? (
          <Skeleton className="mt-4 h-24 rounded-xl" />
        ) : historyQuery.isError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {formatApiError(historyQuery.error)}
          </p>
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
                  · {formatPublishedDate(entry.createdAt) ?? "—"}
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

function InternalCommentEditor({
  savedComment,
  disabled,
  onSave,
}: {
  savedComment: string | null;
  disabled: boolean;
  onSave: (comment: string) => Promise<void>;
}) {
  const [comment, setComment] = useState(savedComment ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      await onSave(comment);
    } catch (saveError) {
      setError(normalizeApiError(saveError).message);
    }
  };

  return (
    <div className="mt-5 space-y-2 border-t pt-4">
      <label
        htmlFor="employer-internal-comment"
        className="text-sm font-semibold"
      >
        Редактировать внутренний комментарий
      </label>
      <textarea
        id="employer-internal-comment"
        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        Пустое значение очистит внутренний комментарий.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button variant="outline" disabled={disabled} onClick={() => void save()}>
        {disabled ? "Сохраняем..." : "Сохранить комментарий"}
      </Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section className="mt-5 border-t pt-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{text}</p>
    </section>
  );
}

function ResumeSnapshot({ snapshot }: { snapshot: Record<string, unknown> }) {
  const desiredPosition =
    typeof snapshot.desiredPosition === "string"
      ? snapshot.desiredPosition
      : null;
  const summary =
    typeof snapshot.summary === "string" ? snapshot.summary : null;
  const city = typeof snapshot.city === "string" ? snapshot.city : null;
  const desiredSalary =
    typeof snapshot.desiredSalary === "number"
      ? snapshot.desiredSalary
      : typeof snapshot.desiredSalaryMin === "number"
        ? snapshot.desiredSalaryMin
        : typeof snapshot.desiredSalaryMax === "number"
          ? snapshot.desiredSalaryMax
          : null;
  const experiences = Array.isArray(snapshot.experiences)
    ? snapshot.experiences
    : [];
  const educations = Array.isArray(snapshot.educations)
    ? snapshot.educations
    : [];

  return (
    <div className="mt-4 space-y-4">
      {desiredPosition ? (
        <TextBlock title="Профессия" text={desiredPosition} />
      ) : null}
      {city ? <Info label="Город" value={city} /> : null}
      {desiredSalary ? (
        <Info
          label="Желаемая зарплата"
          value={`${desiredSalary.toLocaleString("ru-RU")} ₽`}
        />
      ) : null}
      {summary ? (
        <TextBlock title="Профессиональное резюме" text={summary} />
      ) : null}
      {experiences.length ? (
        <section>
          <h3 className="font-semibold">Опыт работы</h3>
          <ul className="mt-3 space-y-3">
            {experiences.map((experience, index) => {
              if (typeof experience !== "object" || experience === null) {
                return null;
              }
              const item = experience as Record<string, unknown>;
              const companyName =
                typeof item.companyName === "string" ? item.companyName : "";
              const position =
                typeof item.position === "string" ? item.position : "";
              const description =
                typeof item.description === "string" ? item.description : null;
              return (
                <li key={index} className="rounded-md border p-3">
                  <p className="font-medium">
                    {[position, companyName].filter(Boolean).join(" · ")}
                  </p>
                  {description ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {description}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {educations.length ? (
        <section>
          <h3 className="font-semibold">Образование</h3>
          <ul className="mt-3 space-y-3">
            {educations.map((education, index) => {
              if (typeof education !== "object" || education === null) {
                return null;
              }
              const item = education as Record<string, unknown>;
              const institution =
                typeof item.institution === "string" ? item.institution : "";
              const specialization =
                typeof item.specialization === "string"
                  ? item.specialization
                  : "";
              const degree =
                typeof item.degree === "string" ? item.degree : null;
              return (
                <li key={index} className="rounded-md border p-3">
                  <p className="font-medium">
                    {[institution, degree].filter(Boolean).join(" · ") ||
                      "Учебное заведение"}
                  </p>
                  {specialization ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {specialization}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
