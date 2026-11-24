import { AuthGuard } from "@/features/auth/components/auth-guard";
import { ResumeEditorPage } from "@/features/candidate/components/resume-editor-page";

export default function NewResumeRoute() {
  return (
    <AuthGuard requiredRole="CANDIDATE">
      <ResumeEditorPage />
    </AuthGuard>
  );
}
