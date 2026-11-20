"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/features/auth/session-provider";
import { RealtimeProvider } from "@/features/realtime/realtime-provider";
import { QueryProvider } from "@/providers/query-provider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <SessionProvider>
        <RealtimeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </RealtimeProvider>
      </SessionProvider>
    </QueryProvider>
  );
}
