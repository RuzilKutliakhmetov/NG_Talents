import type { ReactNode } from "react";

import { AuthGuard } from "@/features/auth/components/auth-guard";
import { EmployerNavigation } from "@/features/employer/components/employer-navigation";

export default function EmployerLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="EMPLOYER">
      <div className="flex min-h-screen flex-col bg-muted/20">
        <EmployerNavigation />
        {children}
      </div>
    </AuthGuard>
  );
}
