"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@/features/auth/api";
import { authStore } from "@/features/auth/store";
import { MessagesNavigationLink } from "@/features/messages/components/messages-navigation-link";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { normalizeApiError } from "@/lib/api/api-error";
import { cn } from "cn";

const links = [
  { href: "/candidate", label: "Обзор", exact: true },
  { href: "/candidate/applications", label: "Мои отклики", exact: false },
];

export function CandidateNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const authState = authStore(
    useShallow((state) => ({
      status: state.status,
      role: state.user?.role,
    })),
  );

  if (
    authState.status !== "authenticated" ||
    authState.role !== "CANDIDATE"
  ) {
    return null;
  }

  const signOut = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
      router.replace("/login");
    }
  };

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Link href="/candidate" className="text-lg font-semibold tracking-tight">
          NG Talents <span className="text-muted-foreground">/ Кандидат</span>
        </Link>
        <nav aria-label="Разделы кабинета кандидата" className="flex flex-wrap gap-2">
          {links.map(({ href, label, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: active ? "secondary" : "ghost",
                    size: "sm",
                  }),
                )}
              >
                {label}
              </Link>
            );
          })}
          <MessagesNavigationLink href="/candidate/messages" />
          <NotificationBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
          >
            Выйти
          </Button>
        </nav>
      </div>
    </header>
  );
}
