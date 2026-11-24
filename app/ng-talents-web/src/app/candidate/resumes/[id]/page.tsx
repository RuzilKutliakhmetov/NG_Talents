import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { ResumeEditorPage } from "@/features/candidate/components/resume-editor-page";

interface ResumeRouteProps {
  params: Promise<{ id: string }>;
}

export const instant = false;

export default function ResumeRoute({ params }: ResumeRouteProps) {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
            <Skeleton className="h-96 rounded-2xl" />
          </main>
        }
      >
        <ResolvedResumeRoute params={params} />
      </Suspense>
    </AuthGuard>
  );
}

async function ResolvedResumeRoute({ params }: ResumeRouteProps) {
  const { id } = await params;
  return <ResumeEditorPage id={id} />;
}
