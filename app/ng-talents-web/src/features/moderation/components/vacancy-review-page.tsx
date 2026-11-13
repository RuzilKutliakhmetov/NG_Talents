"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatSalary,
  getCertificationLabel,
  getEmploymentLabel,
  getRegionLabel,
  getRequirementLabel,
  getWorkFormatLabel,
} from "@/features/vacancies/lib";
import { formatApiError } from "@/features/employer/lib";
import { normalizeApiError } from "@/lib/api/api-error";

import {
  useApproveVacancy,
  useModerationVacancy,
  useRejectVacancy,
  useStartVacancyModeration,
  useVacancyModerationAudit,
} from "../hooks";
import type { ModerationAuditEntry } from "../types";

const STATUS_LABELS = {
  DRAFT: "Черновик",
  PENDING_MODERATION: "Ожидает модерации",
  MODERATION: "На модерации",
  PUBLISHED: "Опубликована",
  PAUSED: "Приостановлена",
  CLOSED: "Закрыта",
  REJECTED: "Отклонена",
  ARCHIVED: "В архиве",
} as const;

const AUDIT_ACTION_LABELS: Record<ModerationAuditEntry["action"], string> = {
  START_MODERATION: "Начало проверки",
  APPROVE: "Одобрение",
  REJECT: "Отклонение",
  RESUBMIT: "Повторная отправка",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Не указана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Не указана";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function VacancyReviewPage({
  employerId,
  vacancyId,
}: {
  employerId: string;
  vacancyId: string;
}) {
  const router = useRouter();
  const vacancyQuery = useModerationVacancy(employerId, vacancyId);
  const auditQuery = useVacancyModerationAudit(vacancyId, Boolean(employerId));
  const startMutation = useStartVacancyModeration(employerId, vacancyId);
  const approveMutation = useApproveVacancy(employerId, vacancyId);
  const rejectMutation = useRejectVacancy(employerId, vacancyId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const isMutating =
    startMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending;

  const startReview = async () => {
    if (!window.confirm("Начать проверку этой вакансии?")) return;
    setDecisionError(null);
    try {
      await startMutation.mutateAsync();
      toast.success("Проверка начата. Статус подтверждён backend.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const approve = async () => {
    if (!window.confirm("Одобрить вакансию и опубликовать её?")) return;
    setDecisionError(null);
    try {
      await approveMutation.mutateAsync();
      toast.success("Вакансия одобрена. Статус получен от backend.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const reject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedComment = comment.trim();
    if (normalizedComment.length < 3) {
      setDecisionError("Причина должна содержать не менее 3 символов.");
      return;
    }
    if (normalizedComment.length > 2000) {
      setDecisionError("Причина не должна превышать 2000 символов.");
      return;
    }

    setDecisionError(null);
    try {
      await rejectMutation.mutateAsync(normalizedComment);
      setRejectOpen(false);
      setComment("");
      toast.success("Вакансия отклонена. Статус получен от backend.");
    } catch (error) {
      setDecisionError(normalizeApiError(error).message);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Проверка вакансии
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ID вакансии: <span className="font-mono">{vacancyId}</span>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/moderator/vacancies")}
        >
          К вводу ID
        </Button>
      </div>

      {!employerId ? (
        <Card className="p-6" role="alert">
          Не указан ID компании. Вернитесь к вводу идентификаторов и загрузите
          вакансию через её компанию.
        </Card>
      ) : vacancyQuery.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-[460px] rounded-2xl" />
        </div>
      ) : vacancyQuery.isError ? (
        <Card className="p-6" role="alert">
          <h2 className="text-lg font-semibold">
            Не удалось загрузить вакансию
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatApiError(vacancyQuery.error)}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void vacancyQuery.refetch()}
          >
            Повторить
          </Button>
        </Card>
      ) : (
        <>
          <Card className="mb-5 flex flex-wrap items-start justify-between gap-4 p-6">
            <div>
              <h2 className="text-xl font-semibold">
                {vacancyQuery.data.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {vacancyQuery.data.employer.shortName ||
                  vacancyQuery.data.employer.legalName}
              </p>
            </div>
            <Badge
              variant={
                vacancyQuery.data.status === "PUBLISHED"
                  ? "default"
                  : "secondary"
              }
            >
              {STATUS_LABELS[vacancyQuery.data.status]}
            </Badge>
          </Card>

          {vacancyQuery.data.moderationComment ? (
            <Card className="mb-5 border-destructive/40 p-5">
              <h2 className="font-semibold">Комментарий модерации</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {vacancyQuery.data.moderationComment}
              </p>
            </Card>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
              <Section title="Описание и условия">
                <InfoItem label="Описание" value={vacancyQuery.data.description} />
                <InfoItem
                  label="Обязанности"
                  value={vacancyQuery.data.responsibilities}
                />
                <InfoItem
                  label="Требования"
                  value={vacancyQuery.data.requirementsText}
                />
                <InfoItem
                  label="Условия"
                  value={vacancyQuery.data.conditions}
                />
              </Section>

              <Section title="Условия работы">
                <InfoItem
                  label="Зарплата"
                  value={formatSalary(
                    vacancyQuery.data.salaryMin,
                    vacancyQuery.data.salaryMax,
                    vacancyQuery.data.currency,
                  )}
                />
                <InfoItem
                  label="Зарплата до/после налогов"
                  value={
                    vacancyQuery.data.salaryGross === null
                      ? "Не указано"
                      : vacancyQuery.data.salaryGross
                        ? "До удержания налогов"
                        : "После удержания налогов"
                  }
                />
                <InfoItem
                  label="Занятость"
                  value={
                    getEmploymentLabel(vacancyQuery.data.employmentType) ??
                    vacancyQuery.data.employmentType
                  }
                />
                <InfoItem
                  label="Формат работы"
                  value={
                    getWorkFormatLabel(vacancyQuery.data.workFormat) ??
                    vacancyQuery.data.workFormat
                  }
                />
                <InfoItem
                  label="Регион"
                  value={
                    getRegionLabel(vacancyQuery.data.locationRegion) ??
                    vacancyQuery.data.locationRegion
                  }
                />
                <InfoItem label="Город" value={vacancyQuery.data.locationCity} />
                <InfoItem
                  label="Адрес"
                  value={vacancyQuery.data.locationAddress}
                />
                <InfoItem label="График" value={vacancyQuery.data.schedule} />
                <InfoItem
                  label="Жильё"
                  value={vacancyQuery.data.housingProvided ? "Предоставляется" : "Не предоставляется"}
                />
                <InfoItem
                  label="Проезд / перелёт"
                  value={vacancyQuery.data.travelProvided ? "Оплачивается" : "Не оплачивается"}
                />
                <InfoItem
                  label="Медицинская страховка"
                  value={vacancyQuery.data.medicalInsurance ? "Предоставляется" : "Не предоставляется"}
                />
              </Section>

              <Section title="Требования и сертификаты">
                {vacancyQuery.data.requirements.length ? (
                  <ul className="space-y-3">
                    {vacancyQuery.data.requirements.map((requirement) => (
                      <li key={requirement.id} className="rounded-md border p-3">
                        <p className="font-medium">
                          {requirement.name}{" "}
                          <span className="font-normal text-muted-foreground">
                            ({getRequirementLabel(requirement.type) ?? requirement.type})
                          </span>
                        </p>
                        {requirement.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {requirement.description}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {requirement.required ? "Обязательное" : "Необязательное"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Структурированные требования не указаны.
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {vacancyQuery.data.certifications.length ? (
                    vacancyQuery.data.certifications.map((certification) => (
                      <div
                        key={certification.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <p className="font-medium">
                          {certification.name ||
                            getCertificationLabel(certification.type) ||
                            certification.type}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {certification.required
                            ? "Обязательный сертификат"
                            : "Необязательный сертификат"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Сертификаты не указаны.
                    </p>
                  )}
                </div>
              </Section>

              <Section title="Компания и работодатель">
                <InfoItem
                  label="Юридическое наименование"
                  value={vacancyQuery.data.employer.legalName}
                />
                <InfoItem
                  label="Краткое наименование"
                  value={vacancyQuery.data.employer.shortName}
                />
                <InfoItem label="ID компании" value={vacancyQuery.data.employer.id} />
                <InfoItem
                  label="Создатель"
                  value={
                    vacancyQuery.data.createdBy
                      ? `${vacancyQuery.data.createdBy.firstName} ${vacancyQuery.data.createdBy.lastName}`.trim()
                      : undefined
                  }
                />
                <InfoItem
                  label="Email создателя"
                  value={vacancyQuery.data.createdBy?.email}
                />
                <InfoItem
                  label="ID создателя"
                  value={vacancyQuery.data.createdBy?.id}
                />
              </Section>

              <Section title="Даты">
                <InfoItem
                  label="Создана"
                  value={formatDateTime(vacancyQuery.data.createdAt)}
                />
                <InfoItem
                  label="Обновлена"
                  value={formatDateTime(vacancyQuery.data.updatedAt)}
                />
                <InfoItem
                  label="Опубликована"
                  value={formatDateTime(vacancyQuery.data.publishedAt)}
                />
                <InfoItem
                  label="Срок действия"
                  value={formatDateTime(vacancyQuery.data.expiresAt)}
                />
                <InfoItem
                  label="Закрыта"
                  value={formatDateTime(vacancyQuery.data.closedAt)}
                />
              </Section>

              <Section title="История модерации">
                {auditQuery.isPending ? (
                  <Skeleton className="h-24 rounded-xl" />
                ) : auditQuery.isError ? (
                  <div role="alert">
                    <p className="text-sm text-destructive">
                      {formatApiError(auditQuery.error)}
                    </p>
                    <Button
                      className="mt-3"
                      variant="outline"
                      size="sm"
                      onClick={() => void auditQuery.refetch()}
                    >
                      Повторить
                    </Button>
                  </div>
                ) : auditQuery.data.items.length ? (
                  <ol className="space-y-3">
                    {auditQuery.data.items.map((entry) => (
                      <li key={entry.id} className="rounded-md border p-3">
                        <p className="font-medium">
                          {AUDIT_ACTION_LABELS[entry.action]}
                          {entry.fromStatus && entry.toStatus
                            ? `: ${STATUS_LABELS[entry.fromStatus]} → ${STATUS_LABELS[entry.toStatus]}`
                            : ""}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {entry.actor.role} · {formatDateTime(entry.createdAt)}
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
                  <p className="text-sm text-muted-foreground">
                    Записей аудита пока нет.
                  </p>
                )}
              </Section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <Card className="space-y-4 p-5">
                <h2 className="font-semibold">Решение</h2>
                {vacancyQuery.data.status === "PENDING_MODERATION" ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Вакансия ожидает начала проверки.
                    </p>
                    <Button
                      className="w-full"
                      disabled={isMutating}
                      onClick={() => void startReview()}
                    >
                      {startMutation.isPending
                        ? "Начинаем проверку..."
                        : "Начать проверку"}
                    </Button>
                  </>
                ) : vacancyQuery.data.status === "MODERATION" ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Проверьте сведения перед вынесением решения.
                    </p>
                    <Button
                      className="w-full"
                      disabled={isMutating}
                      onClick={() => void approve()}
                    >
                      {approveMutation.isPending
                        ? "Одобряем..."
                        : "Одобрить и опубликовать"}
                    </Button>
                    {!rejectOpen ? (
                      <Button
                        className="w-full"
                        variant="destructive"
                        disabled={isMutating}
                        onClick={() => {
                          setDecisionError(null);
                          setRejectOpen(true);
                        }}
                      >
                        Отклонить
                      </Button>
                    ) : (
                      <form className="space-y-3" onSubmit={reject}>
                        <div className="space-y-2">
                          <label
                            htmlFor="moderation-rejection-comment"
                            className="text-sm font-medium"
                          >
                            Причина отклонения
                          </label>
                          <textarea
                            id="moderation-rejection-comment"
                            className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={comment}
                            maxLength={2000}
                            onChange={(event) => setComment(event.target.value)}
                            aria-describedby="moderation-rejection-help"
                            required
                          />
                          <p
                            id="moderation-rejection-help"
                            className="text-xs text-muted-foreground"
                          >
                            Не менее 3 символов после удаления пробелов; максимум
                            2000 символов.
                          </p>
                        </div>
                        {decisionError ? (
                          <p className="text-sm text-destructive" role="alert">
                            {decisionError}
                          </p>
                        ) : null}
                        <Button
                          className="w-full"
                          variant="destructive"
                          type="submit"
                          disabled={isMutating}
                        >
                          {rejectMutation.isPending
                            ? "Отправляем решение..."
                            : "Подтвердить отклонение"}
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          type="button"
                          disabled={isMutating}
                          onClick={() => {
                            setRejectOpen(false);
                            setDecisionError(null);
                          }}
                        >
                          Отмена
                        </Button>
                      </form>
                    )}
                    {!rejectOpen && decisionError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {decisionError}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Для текущего статуса нет доступных действий модерации.
                    Повторный переход возможен только если его разрешает backend.
                  </p>
                )}
              </Card>
              {vacancyQuery.data.status === "PENDING_MODERATION" ||
              vacancyQuery.data.status === "MODERATION" ? (
                <Card className="p-4 text-sm text-muted-foreground">
                  Доступность действия и допустимость перехода дополнительно
                  проверяются API. При устаревшем статусе серверный отказ будет
                  показан без локального изменения результата.
                </Card>
              ) : null}
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
        {value ?? "Не указано"}
      </dd>
    </div>
  );
}
