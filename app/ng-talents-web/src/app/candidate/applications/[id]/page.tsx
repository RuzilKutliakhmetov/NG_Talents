import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { CandidateApplicationDetailPage } from "@/features/applications/components/candidate-application-detail-page";

interface CandidateApplicationRouteProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export default function CandidateApplicationRoute({
  params,
}: CandidateApplicationRouteProps) {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-8 sm:px-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </main>
        }
      >
        <ResolvedCandidateApplicationRoute params={params} />
      </Suspense>
    </AuthGuard>
  );
}

async function ResolvedCandidateApplicationRoute({
  params,
}: CandidateApplicationRouteProps) {
  const { id } = await params;
  return <CandidateApplicationDetailPage id={id} />;
}
