"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { VacancyFilters } from "@/features/vacancies/components/vacancy-filters";
import { VacancyListSkeleton } from "@/features/vacancies/components/vacancy-list-skeleton";
import { VacancyList } from "@/features/vacancies/components/vacancy-list";
import {
  VacancyEmptyState,
  VacancyErrorState,
} from "@/features/vacancies/components/vacancy-states";
import { VacancyPagination } from "@/features/vacancies/components/vacancy-pagination";
import {
  getApiErrorStatus,
} from "@/lib/api/api-error";

import {
  getSearchParamsSignature,
  hasInvalidSalaryRange,
  parseVacancySearchParams,
  serializeVacancySearchParams,
} from "../lib";
import { usePublicVacancies } from "../hooks";
import type { VacancyListParams, VacancySearchParams } from "../types";

interface VacancyCatalogProps {
  searchParams: VacancySearchParams;
}

function createVacanciesUrl(params: VacancyListParams) {
  const query = serializeVacancySearchParams(params);
  return query ? `/vacancies?${query}` : "/vacancies";
}

export function VacancyCatalog({ searchParams }: VacancyCatalogProps) {
  const signature = getSearchParamsSignature(searchParams);
  return (
    <VacancyCatalogState
      key={signature}
      initialSearchParams={searchParams}
    />
  );
}

function VacancyCatalogState({
  initialSearchParams,
}: {
  initialSearchParams: VacancySearchParams;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(() =>
    parseVacancySearchParams(initialSearchParams),
  );
  const filtersRef = useRef(filters);

  const updateFilters = useCallback(
    (updates: Partial<VacancyListParams>) => {
      const next = {
        ...filtersRef.current,
        ...updates,
        page: 1,
      };
      filtersRef.current = next;
      setFilters(next);
      router.replace(createVacanciesUrl(next), { scroll: false });
    },
    [router],
  );

  const changePage = useCallback(
    (page: number) => {
      const next = { ...filtersRef.current, page };
      filtersRef.current = next;
      setFilters(next);
      router.replace(createVacanciesUrl(next), { scroll: false });
    },
    [router],
  );

  const resetFilters = useCallback(() => {
    const next = parseVacancySearchParams({});
    filtersRef.current = next;
    setFilters(next);
    router.replace("/vacancies", { scroll: false });
  }, [router]);

  const vacanciesQuery = usePublicVacancies(filters);
  const data = vacanciesQuery.data;

  useEffect(() => {
    if (!data) return;
    const lastPage = Math.max(data.meta.totalPages, 1);
    if (filters.page > lastPage) {
      router.replace(
        createVacanciesUrl({ ...filters, page: lastPage }),
        { scroll: false },
      );
    }
  }, [data, filters, router]);

  const status = vacanciesQuery.error
    ? getApiErrorStatus(vacanciesQuery.error)
    : undefined;
  const invalidSalary = hasInvalidSalaryRange(initialSearchParams);
  const hasActiveFilters = Boolean(
    filters.title ||
      filters.employmentType ||
      filters.locationRegion ||
      filters.locationCity ||
      filters.workFormat ||
      filters.salaryMin !== undefined ||
      filters.salaryMax !== undefined ||
      filters.certification,
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            NG Talents
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Вакансии
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Публичные предложения от работодателей. Используйте фильтры, чтобы
            найти подходящую работу.
          </p>
        </div>
        <Link
          href="/"
          className={buttonVariants({ variant: "outline" })}
        >
          На главную
        </Link>
      </header>

      <VacancyFilters
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        invalidSalaryFromUrl={invalidSalary}
      />

      <section className="mt-8" aria-live="polite">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {data
              ? `${data.meta.total} ${
                  new Intl.PluralRules("ru").select(data.meta.total) === "one"
                    ? "вакансия"
                    : new Intl.PluralRules("ru").select(data.meta.total) === "few"
                      ? "вакансии"
                      : "вакансий"
                }`
              : "Результаты поиска"}
          </h2>
          {hasActiveFilters ? (
            <Button variant="link" size="sm" onClick={resetFilters}>
              Очистить фильтры
            </Button>
          ) : null}
        </div>

        {vacanciesQuery.isPending ? (
          <VacancyListSkeleton />
        ) : vacanciesQuery.isError ? (
          <VacancyErrorState
            status={status}
            onRetry={() => void vacanciesQuery.refetch()}
          />
        ) : !data ? (
          <VacancyListSkeleton />
        ) : data.items.length === 0 ? (
          <VacancyEmptyState onReset={resetFilters} />
        ) : (
          <>
            <VacancyList vacancies={data.items} searchContext={filters} />
            <div className="mt-6">
              <VacancyPagination
                meta={data.meta}
                onPageChange={changePage}
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
