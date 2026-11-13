import type { ReactNode } from "react";

import { AuthGuard } from "@/features/auth/components/auth-guard";
import { ModeratorNavigation } from "@/features/moderation/components/moderator-navigation";

const MODERATION_ROLES = ["ADMIN", "MODERATOR"] as const;

export default function ModeratorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={MODERATION_ROLES}>
      <div className="flex min-h-screen flex-col bg-muted/20">
        <ModeratorNavigation />
        {children}
      </div>
    </AuthGuard>
  );
}
