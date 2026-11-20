"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { MessagesNavigationLink } from "@/features/messages/components/messages-navigation-link";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { cn } from "cn";

const links = [
  { href: "/employer", label: "Обзор", exact: true },
  { href: "/employer/company", label: "Компания", exact: false },
  { href: "/employer/vacancies", label: "Вакансии", exact: false },
  { href: "/employer/applications", label: "Отклики", exact: false },
];

export function EmployerNavigation() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Link href="/employer" className="text-lg font-semibold tracking-tight">
          NG Talents <span className="text-muted-foreground">/ Работодатель</span>
        </Link>
        <nav aria-label="Разделы кабинета" className="flex flex-wrap gap-2">
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
          <MessagesNavigationLink href="/employer/messages" />
          <NotificationBell />
        </nav>
      </div>
    </header>
  );
}
