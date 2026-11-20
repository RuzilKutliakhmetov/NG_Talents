import { AuthGuard } from "@/features/auth/components/auth-guard";
import { NotificationPreferencesPage } from "@/features/notifications/components/notification-preferences-page";
import { USER_ROLES } from "@/types/api";

export default function NotificationPreferencesRoute() {
  return (
    <AuthGuard allowedRoles={USER_ROLES}>
      <NotificationPreferencesPage />
    </AuthGuard>
  );
}
