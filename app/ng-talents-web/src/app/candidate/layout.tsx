import type { ReactNode } from "react";

import { CandidateNavigation } from "@/features/applications/components/candidate-navigation";

export default function CandidateLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <CandidateNavigation />
      {children}
    </div>
  );
}
