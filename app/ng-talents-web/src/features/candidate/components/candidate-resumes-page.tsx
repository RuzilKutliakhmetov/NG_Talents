"use client";

import Link from "next/link";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeApiError } from "@/lib/api/api-error";
import { cn } from "cn";

import {
  useArchiveResume,
  useCopyResume,
  useDeleteResume,
  usePublishResume,
  useStructuredResumes,
  useUnpublishResume,
} from "../hooks";

const statusLabels = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  ARCHIVED: "Архив",
};

export function CandidateResumesPage() {
  const query = useStructuredResumes();
  const publish = usePublishResume();
  const unpublish = useUnpublishResume();
  const archive = useArchiveResume();
  const copy = useCopyResume();
  const remove = useDeleteResume();

  const runAction = async (
    action: (id: string) => Promise<unknown>,
    id: string,
    success: string,
  ) => {
    try {
      await action(id);
      toast.success(success);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  if (query.isPending) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Skeleton className="h-80 rounded-2xl" />
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Card className="p-6" role="alert">
          <p className="text-sm text-destructive">
            {normalizeApiError(query.error).message}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void query.refetch()}
          >
            Повторить
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader className="border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Мои резюме</CardTitle>
          <Link
            href="/candidate/resumes/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Plus aria-hidden="true" />
            Создать резюме
          </Link>
        </CardHeader>
        <CardContent className="gap-0 px-0 py-0">
          {query.data.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium">У вас пока нет резюме</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Создайте структурированное резюме для откликов.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {query.data.map((resume) => (
                <li key={resume.id} className="px-4 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold">
                          {resume.desiredPosition || "Профессия не указана"}
                        </h2>
                        <Badge variant="outline">{statusLabels[resume.status]}</Badge>
                        {resume.isPrimary ? <Badge>Основное</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {resume.specialization || "Специализация не указана"}
                        {resume.city ? ` · ${resume.city}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Обновлено:{" "}
                        {new Intl.DateTimeFormat("ru-RU", {
                          dateStyle: "medium",
                        }).format(new Date(resume.updatedAt))}
                      </p>
                      {resume.completion ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Заполненность: {resume.completion.percent}% ·{" "}
                          {resume.completion.canPublish
                            ? "готово к публикации"
                            : "требуется заполнение"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/candidate/resumes/${resume.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        Открыть
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={copy.isPending}
                        onClick={() =>
                          void runAction(copy.mutateAsync, resume.id, "Копия создана.")
                        }
                      >
                        <Copy aria-hidden="true" />
                        Копия
                      </Button>
                      {resume.status === "DRAFT" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={publish.isPending}
                          onClick={() =>
                            void runAction(publish.mutateAsync, resume.id, "Резюме опубликовано.")
                          }
                        >
                          Опубликовать
                        </Button>
                      ) : null}
                      {resume.status === "PUBLISHED" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={unpublish.isPending}
                          onClick={() =>
                            void runAction(unpublish.mutateAsync, resume.id, "Резюме снято с публикации.")
                          }
                        >
                          Снять
                        </Button>
                      ) : null}
                      {resume.status !== "ARCHIVED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={archive.isPending}
                          onClick={() =>
                            window.confirm("Переместить резюме в архив?")
                              ? void runAction(archive.mutateAsync, resume.id, "Резюме архивировано.")
                              : undefined
                          }
                        >
                          В архив
                        </Button>
                      ) : null}
                      {resume.status === "DRAFT" ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          aria-label="Удалить черновик резюме"
                          disabled={remove.isPending}
                          onClick={() =>
                            window.confirm("Удалить черновик резюме?")
                              ? void runAction(remove.mutateAsync, resume.id, "Черновик удалён.")
                              : undefined
                          }
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
