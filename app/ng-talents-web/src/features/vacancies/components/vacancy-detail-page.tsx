"use client";

import Link from "next/link";
import { isAxiosError } from "axios";
import { ArrowLeft } from "lucide-react";

import { buttonVariants, Button } from "@/components/ui/button";
import { VacancyDetails } from "@/features/vacancies/components/vacancy-details";
import { VacancyListSkeleton } from "@/features/vacancies/components/vacancy-list-skeleton";
import { usePublicVacancy } from "@/features/vacancies/hooks";
import type { VacancySearchParams } from "@/features/vacancies/types";

import {
  parseVacancySearchParams,
  serializeVacancySearchParams,
} from "../lib";

interface VacancyDetailPageProps {
  id: string;
  searchParams: VacancySearchParams;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function VacancyDetailPage({
  id,
  searchParams,
}: VacancyDetailPageProps) {
  const isValidId = uuidPattern.test(id);
  const query = usePublicVacancy(id, isValidId);
  const backQuery = serializeVacancySearchParams(
    parseVacancySearchParams(searchParams),
  );
  const backHref = backQuery ? `/vacancies?${backQuery}` : "/vacancies";

  if (!isValidId) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
        <Link
          href="/vacancies"
          className={buttonVariants({ variant: "ghost", className: "-ml-3 mb-5" })}
        >
          <ArrowLeft aria-hidden="true" />
          Назад к вакансиям
        </Link>
        <section className="rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold">Вакансия не найдена</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            В адресе страницы указан некорректный идентификатор вакансии.
          </p>
        </section>
      </main>
    );
  }

  if (query.isPending) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
        <VacancyListSkeleton />
      </main>
    );
  }

  if (query.isError) {
    const status = isAxiosError(query.error)
      ? query.error.response?.status
      : undefined;
    const isNotFound = status === 404;
    const isNetworkError = isAxiosError(query.error) && !query.error.response;
    const title = isNotFound ? "Вакансия не найдена" : "Не удалось загрузить вакансию";
    const description = isNotFound
      ? "Возможно, вакансия больше не опубликована или была удалена."
      : isNetworkError
        ? "Не удалось связаться с сервером. Проверьте подключение и повторите запрос."
        : status === 401 || status === 403
          ? `Сервер отказал в доступе к публичной вакансии (${status}).`
          : "Произошла ошибка при загрузке данных. Попробуйте ещё раз позже.";

    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
        <Link
          href={backHref}
          className={buttonVariants({ variant: "ghost", className: "-ml-3 mb-5" })}
        >
          <ArrowLeft aria-hidden="true" />
          Назад к вакансиям
        </Link>
        <section
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          {!isNotFound ? (
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => void query.refetch()}
            >
              Повторить запрос
            </Button>
          ) : null}
        </section>
      </main>
    );
  }

  return <VacancyDetails vacancy={query.data} backHref={backHref} />;
}
