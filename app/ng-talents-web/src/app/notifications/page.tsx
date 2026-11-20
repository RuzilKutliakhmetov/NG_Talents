import { AuthGuard } from "@/features/auth/components/auth-guard";
import { NotificationsPage } from "@/features/notifications/components/notifications-page";
import { USER_ROLES } from "@/types/api";

export default function NotificationsRoute() {
  return (
    <AuthGuard allowedRoles={USER_ROLES}>
      <NotificationsPage />
    </AuthGuard>
  );
}
