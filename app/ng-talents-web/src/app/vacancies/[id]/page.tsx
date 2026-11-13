import { Suspense } from "react";

import { VacancyDetailPage } from "@/features/vacancies/components/vacancy-detail-page";
import { VacancyListSkeleton } from "@/features/vacancies/components/vacancy-list-skeleton";
import type { VacancySearchParams } from "@/features/vacancies/types";

interface VacancyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<VacancySearchParams>;
}

export default function VacancyPage({
  params,
  searchParams,
}: VacancyPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
          <VacancyListSkeleton />
        </main>
      }
    >
      <ResolvedVacancyPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ResolvedVacancyPage({
  params,
  searchParams,
}: VacancyPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <VacancyDetailPage id={id} searchParams={query} />;
}
