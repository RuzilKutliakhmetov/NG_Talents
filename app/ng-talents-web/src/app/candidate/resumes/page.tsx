import { AuthGuard } from "@/features/auth/components/auth-guard";
import { CandidateResumesPage } from "@/features/candidate/components/candidate-resumes-page";

export default function CandidateResumesRoute() {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <CandidateResumesPage />
    </AuthGuard>
  );
}
