import { Suspense } from "react";

import { VacancyEditorPage } from "@/features/employer/components/vacancy-editor-page";
import { Skeleton } from "@/components/ui/skeleton";

interface EditVacancyRouteProps {
  params: Promise<{ id: string }>;
}

export default function EditVacancyRoute({
  params,
}: EditVacancyRouteProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Skeleton className="h-[700px] rounded-2xl" />
        </main>
      }
    >
      <ResolvedEditVacancyRoute params={params} />
    </Suspense>
  );
}

async function ResolvedEditVacancyRoute({
  params,
}: EditVacancyRouteProps) {
  const { id } = await params;
  return <VacancyEditorPage vacancyId={id} />;
}
