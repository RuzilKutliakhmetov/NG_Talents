import { AuthGuard } from "@/features/auth/components/auth-guard";
import { CandidateApplicationsPage } from "@/features/applications/components/candidate-applications-page";

export const instant = false;

export default function CandidateApplicationsRoute() {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <CandidateApplicationsPage />
    </AuthGuard>
  );
}
