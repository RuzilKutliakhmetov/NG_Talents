import { CandidateProfilePage } from "@/features/candidate/components/candidate-profile-page";
import { AuthGuard } from "@/features/auth/components/auth-guard";

export default function CandidateProfileRoute() {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <CandidateProfilePage />
    </AuthGuard>
  );
}
