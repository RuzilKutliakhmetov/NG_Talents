import { AuthGuard } from "@/features/auth/components/auth-guard";
import { CandidateHome } from "@/features/applications/components/candidate-home";

export default function CandidatePage() {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <CandidateHome />
    </AuthGuard>
  );
}
