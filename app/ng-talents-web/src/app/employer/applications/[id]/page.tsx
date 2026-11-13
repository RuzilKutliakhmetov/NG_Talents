import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EmployerApplicationDetailPage } from "@/features/applications/components/employer-application-detail-page";

interface EmployerApplicationRouteProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export default function EmployerApplicationRoute({
  params,
}: EmployerApplicationRouteProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      }
    >
      <ResolvedEmployerApplicationRoute params={params} />
    </Suspense>
  );
}

async function ResolvedEmployerApplicationRoute({
  params,
}: EmployerApplicationRouteProps) {
  const { id } = await params;
  return <EmployerApplicationDetailPage applicationId={id} />;
}
