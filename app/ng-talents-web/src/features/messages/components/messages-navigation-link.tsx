"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useMessageUnreadCount } from "@/features/messages/hooks";
import { cn } from "cn";

interface MessagesNavigationLinkProps {
  href: string;
}

export function MessagesNavigationLink({
  href,
}: MessagesNavigationLinkProps) {
  const unreadQuery = useMessageUnreadCount();
  const count = unreadQuery.data ?? 0;

  return (
    <Link
      href={href}
      aria-label={
        count > 0 ? `Сообщения, непрочитанных: ${count}` : "Сообщения"
      }
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
    >
      <MessageSquare aria-hidden="true" />
      Сообщения
      {count > 0 ? (
        <Badge variant="secondary">{count > 99 ? "99+" : count}</Badge>
      ) : null}
    </Link>
  );
}
