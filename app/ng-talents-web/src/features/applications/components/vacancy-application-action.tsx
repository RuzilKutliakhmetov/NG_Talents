"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { authStore } from "@/features/auth/store";
import {
  APPLICATION_STATUS_LABELS,
} from "@/features/applications/types";
import {
  useCandidateResumes,
  useCreateApplication,
  useVacancyApplication,
} from "@/features/applications/hooks";
import { normalizeApiError } from "@/lib/api/api-error";
import type { Application } from "@/types/api";
import { cn } from "cn";

export function VacancyApplicationAction({
  vacancyId,
}: {
  vacancyId: string;
}) {
  const auth = authStore(
    useShallow((state) => ({ status: state.status, user: state.user })),
  );
  const isCandidate =
    auth.status === "authenticated" && auth.user?.role === "CANDIDATE";
  const existingQuery = useVacancyApplication(vacancyId, isCandidate);
  const resumesQuery = useCandidateResumes(isCandidate);
  const createMutation = useCreateApplication();
  const [coverLetter, setCoverLetter] = useState("");
  const [candidateComment, setCandidateComment] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdStatus, setCreatedStatus] = useState<Application["status"] | null>(
    null,
  );

  if (auth.status === "loading") return null;

  if (auth.status === "unauthenticated") {
    const returnTo = `/vacancies/${encodeURIComponent(vacancyId)}`;
    return (
      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold">Хотите откликнуться?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Войдите или зарегистрируйтесь как кандидат, чтобы отправить отклик.
          </p>
        </div>
        <Link
          href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          className={cn(buttonVariants())}
        >
          Войти для отклика
        </Link>
      </Card>
    );
  }

  if (!isCandidate) return null;

  const existing = existingQuery.data?.items[0];
  const appliedStatus = createdStatus ?? existing?.status;

  if (appliedStatus) {
    return (
      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Вы уже откликнулись</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Текущий статус:{" "}
          {APPLICATION_STATUS_LABELS[appliedStatus] ?? appliedStatus}.
        </p>
        <Link
          href="/candidate/applications"
          className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
        >
          Перейти к моим откликам
        </Link>
      </Card>
    );
  }

  if (existingQuery.isPending) {
    return (
      <Card className="mt-6 p-5 text-sm text-muted-foreground" aria-live="polite">
        Проверяем, отправляли ли вы отклик...
      </Card>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (coverLetter.length > 2000 || candidateComment.length > 1000) {
      setSubmitError("Проверьте допустимую длину введённых полей.");
      return;
    }

    setSubmitError(null);
    try {
      const result = await createMutation.mutateAsync({
        vacancyId,
        ...(resumeId ? { resumeId } : {}),
        ...(coverLetter.trim() ? { coverLetter: coverLetter.trim() } : {}),
        ...(candidateComment.trim()
          ? { candidateComment: candidateComment.trim() }
          : {}),
      });
      setCreatedStatus(result.status);
      toast.success(
        `Отклик отправлен. Статус: ${APPLICATION_STATUS_LABELS[result.status]}.`,
      );
    } catch (error) {
      setSubmitError(normalizeApiError(error).message);
    }
  };

  return (
    <Card className="mt-6 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Откликнуться на вакансию</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Сопроводительное письмо и дополнительный комментарий необязательны.
      </p>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        {resumesQuery.data?.length ? (
          <div className="space-y-2">
            <label
              htmlFor="application-resume"
              className="text-sm font-medium"
            >
              Резюме
            </label>
            <select
              id="application-resume"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={resumeId}
              onChange={(event) => setResumeId(event.target.value)}
            >
              <option value="">Не прикреплять резюме</option>
              {resumesQuery.data
                .filter((resume) =>
                  resume.status === undefined || resume.status === "PUBLISHED",
                )
                .map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.desiredPosition || "Профессия не указана"}
                  {resume.isPrimary ? " · основное" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {resumesQuery.isError ? (
          <p className="text-sm text-muted-foreground" role="status">
            Не удалось загрузить резюме. Можно отправить отклик без него.
          </p>
        ) : null}
        <div className="space-y-2">
          <label
            htmlFor="application-cover-letter"
            className="text-sm font-medium"
          >
            Сопроводительное письмо
          </label>
          <Textarea
            id="application-cover-letter"
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
            maxLength={2000}
            rows={5}
            disabled={createMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {coverLetter.length}/2000 символов
          </p>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="application-candidate-comment"
            className="text-sm font-medium"
          >
            Дополнительная информация
          </label>
          <Textarea
            id="application-candidate-comment"
            value={candidateComment}
            onChange={(event) => setCandidateComment(event.target.value)}
            maxLength={1000}
            rows={3}
            disabled={createMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {candidateComment.length}/1000 символов
          </p>
        </div>
        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
        {existingQuery.isError ? (
          <p className="text-sm text-muted-foreground" role="status">
            Не удалось проверить предыдущий отклик. Backend всё равно проверит
            повторную отправку при сохранении.
          </p>
        ) : null}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Отправляем..." : "Отправить отклик"}
        </Button>
      </form>
    </Card>
  );
}
