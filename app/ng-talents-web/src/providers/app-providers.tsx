"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/features/auth/session-provider";
import { QueryProvider } from "@/providers/query-provider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <SessionProvider>
        {children}
        <Toaster position="top-right" richColors />
      </SessionProvider>
    </QueryProvider>
  );
}
