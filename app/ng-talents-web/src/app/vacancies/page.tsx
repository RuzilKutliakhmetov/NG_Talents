import { Suspense } from "react";

import { VacancyCatalog } from "@/features/vacancies/components/vacancy-catalog";
import { VacancyListSkeleton } from "@/features/vacancies/components/vacancy-list-skeleton";
import type { VacancySearchParams } from "@/features/vacancies/types";

interface VacanciesPageProps {
  searchParams: Promise<VacancySearchParams>;
}

export default function VacanciesPage({
  searchParams,
}: VacanciesPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          <VacancyListSkeleton />
        </main>
      }
    >
      <ResolvedVacanciesPage searchParams={searchParams} />
    </Suspense>
  );
}

async function ResolvedVacanciesPage({
  searchParams,
}: VacanciesPageProps) {
  return <VacancyCatalog searchParams={await searchParams} />;
}
