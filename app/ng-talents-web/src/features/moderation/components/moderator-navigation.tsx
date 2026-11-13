"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const links = [
  { href: "/moderator", label: "Обзор", exact: true },
  { href: "/moderator/vacancies", label: "Очередь вакансий", exact: false },
];

export function ModeratorNavigation() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Link href="/moderator" className="text-lg font-semibold tracking-tight">
          NG Talents <span className="text-muted-foreground">/ Модерация</span>
        </Link>
        <nav aria-label="Разделы модерации" className="flex flex-wrap gap-2">
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
        </nav>
      </div>
    </header>
  );
}
