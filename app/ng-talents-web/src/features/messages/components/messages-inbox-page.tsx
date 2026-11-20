"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageSquare, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authStore } from "@/features/auth/store";
import { normalizeApiError } from "@/lib/api/api-error";

import { useConversations, useMessageUnreadCount } from "../hooks";
import type { ConversationSummary } from "../types";

interface MessagesInboxPageProps {
  role: "CANDIDATE" | "EMPLOYER";
}

const applicationStatusLabels: Record<string, string> = {
  NEW: "Новый",
  VIEWED: "Просмотрен",
  IN_REVIEW: "На рассмотрении",
  INTERVIEW: "Собеседование",
  OFFER: "Предложение",
  HIRED: "Нанят",
  REJECTED: "Отклонён",
  WITHDRAWN: "Отозван",
};

function getLastMessagePreview(
  conversation: ConversationSummary,
  currentUserId: string | undefined,
): string {
  const message = conversation.lastMessage;
  if (!message) return "Сообщений пока нет";
  const senderName = [message.sender.firstName, message.sender.lastName]
    .filter(Boolean)
    .join(" ");
  const prefix =
    message.senderId === currentUserId
      ? "Вы: "
      : `${senderName || conversation.otherParticipant.displayName}: `;
  return `${prefix}${message.body}`;
}

function formatConversationDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MessagesInboxPage({ role }: MessagesInboxPageProps) {
  const currentUserId = authStore((state) => state.user?.id);
  const [page, setPage] = useState(1);
  const params = { page, limit: 20 };
  const conversationsQuery = useConversations(params);
  const unreadQuery = useMessageUnreadCount();
  const conversations = conversationsQuery.data;
  const totalPages = conversations?.pagination.totalPages ?? 0;
  const routePrefix = role === "CANDIDATE" ? "/candidate" : "/employer";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader className="border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Сообщения</CardTitle>
            <CardDescription className="mt-1">
              Переписка по откликам на вакансии. Непрочитанных:{" "}
              {unreadQuery.data ?? 0}
            </CardDescription>
            {unreadQuery.isError ? (
              <p className="mt-1 text-xs text-destructive">
                Не удалось обновить счётчик сообщений.
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="gap-0 px-0 py-0">
          {conversationsQuery.isPending ? (
            <div className="space-y-3 p-5" aria-label="Загружаем диалоги">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : conversationsQuery.isError ? (
            <div className="p-8 text-center">
              <p role="alert" className="text-sm text-destructive">
                {normalizeApiError(conversationsQuery.error).message}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => void conversationsQuery.refetch()}
              >
                Повторить
              </Button>
            </div>
          ) : conversations && conversations.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <MessageSquare
                aria-hidden="true"
                className="size-10 text-muted-foreground"
              />
              <div>
                <p className="font-medium">Диалогов пока нет</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Диалог появится после создания отклика на вакансию.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {conversations?.items.map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    href={`${routePrefix}/messages/${conversation.id}`}
                    className="flex min-w-0 items-center gap-4 px-4 py-4 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <UserRound aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate font-medium">
                          {conversation.otherParticipant.displayName}
                        </span>
                        <Badge variant="outline">
                          {applicationStatusLabels[conversation.applicationStatus] ??
                            conversation.applicationStatus}
                        </Badge>
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium">
                        {conversation.vacancyTitle}
                      </span>
                      <span className="mt-1 block truncate text-sm text-muted-foreground">
                        {getLastMessagePreview(conversation, currentUserId)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2 text-right">
                      <time
                        className="whitespace-nowrap text-[10px] text-muted-foreground sm:text-xs"
                        dateTime={conversation.updatedAt}
                      >
                        {formatConversationDate(conversation.updatedAt)}
                      </time>
                      {conversation.unreadCount > 0 ? (
                        <Badge>{conversation.unreadCount}</Badge>
                      ) : null}
                    </span>
                    {conversation.unreadCount > 0 ? (
                      <Badge className="sm:hidden">
                        {conversation.unreadCount}
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {conversations && totalPages > 1 ? (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Страница {page} из {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Предыдущая страница диалогов"
                  disabled={page <= 1 || conversationsQuery.isFetching}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Следующая страница диалогов"
                  disabled={page >= totalPages || conversationsQuery.isFetching}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
