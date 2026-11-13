import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { VacancyReviewPage } from "@/features/moderation/components/vacancy-review-page";

interface ModeratorVacancyRouteProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ employerId?: string | string[] }>;
}

export const instant = false;

export default function ModeratorVacancyRoute({
  params,
  searchParams,
}: ModeratorVacancyRouteProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-[600px] rounded-2xl" />
        </main>
      }
    >
      <ResolvedModeratorVacancyRoute
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function ResolvedModeratorVacancyRoute({
  params,
  searchParams,
}: ModeratorVacancyRouteProps) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const employerId = Array.isArray(query.employerId)
    ? query.employerId[0] ?? ""
    : query.employerId ?? "";

  return (
    <VacancyReviewPage
      employerId={employerId}
      vacancyId={routeParams.id}
    />
  );
}
