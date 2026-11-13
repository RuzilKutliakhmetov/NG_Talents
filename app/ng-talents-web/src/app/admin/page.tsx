import { RolePage } from "@/components/shared/role-page";
import { AuthGuard } from "@/features/auth/components/auth-guard";

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="ADMIN">
      <RolePage role="ADMIN" />
    </AuthGuard>
  );
}
