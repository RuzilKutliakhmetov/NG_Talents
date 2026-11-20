"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authStore } from "@/features/auth/store";
import { normalizeApiError } from "@/lib/api/api-error";

import {
  useConversation,
  useConversationMessages,
  useMarkConversationRead,
  useSendMessage,
} from "../hooks";
import type { ConversationMessage } from "../types";

interface ConversationChatPageProps {
  conversationId: string;
  role: "CANDIDATE" | "EMPLOYER";
}

function formatMessageDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSenderName(message: ConversationMessage): string {
  return [message.sender.firstName, message.sender.lastName]
    .filter(Boolean)
    .join(" ");
}

export function ConversationChatPage({
  conversationId,
  role,
}: ConversationChatPageProps) {
  const router = useRouter();
  const currentUserId = authStore((state) => state.user?.id);
  const [draft, setDraft] = useState("");
  const [retryRequest, setRetryRequest] = useState<{
    body: string;
    clientMessageId: string;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const olderMessagesRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousLastMessageId = useRef<string | null>(null);

  const conversationQuery = useConversation(conversationId);
  const messagesQuery = useConversationMessages(conversationId);
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = messagesQuery;
  const { mutate: markRead } = useMarkConversationRead(conversationId);
  const sendMessage = useSendMessage(conversationId);

  const messages = useMemo(
    () =>
      [...(messagesQuery.data?.pages ?? [])]
        .reverse()
        .flatMap((page) => page.items),
    [messagesQuery.data],
  );
  const lastMessageId = messages.at(-1)?.id ?? null;

  useEffect(() => {
    if (!messagesQuery.dataUpdatedAt) return;
    markRead(undefined, {
      onError: (error) => toast.error(normalizeApiError(error).message),
    });
  }, [conversationId, markRead, messagesQuery.dataUpdatedAt]);

  useEffect(() => {
    if (!lastMessageId || previousLastMessageId.current === lastMessageId) {
      return;
    }
    bottomRef.current?.scrollIntoView({
      behavior: previousLastMessageId.current ? "smooth" : "instant",
      block: "end",
    });
    previousLastMessageId.current = lastMessageId;
  }, [lastMessageId]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const sentinel = olderMessagesRef.current;
    if (!root || !sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries[0]?.isIntersecting ||
          isFetchingNextPage ||
          !hasNextPage
        ) {
          return;
        }

        const oldScrollHeight = root.scrollHeight;
        const oldScrollTop = root.scrollTop;
        void fetchNextPage()
          .then(() => {
            requestAnimationFrame(() => {
              root.scrollTop =
                oldScrollTop + root.scrollHeight - oldScrollHeight;
            });
          })
          .catch((error: unknown) =>
            toast.error(normalizeApiError(error).message),
          );
      },
      { root, rootMargin: "80px 0px 0px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  ]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sendMessage.isPending) return;

    const request =
      retryRequest?.body === body
        ? retryRequest
        : { body, clientMessageId: crypto.randomUUID() };
    setRetryRequest(request);
    try {
      await sendMessage.mutateAsync(request);
      setDraft("");
      setRetryRequest(null);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const detail = conversationQuery.data;
  const inboxHref = role === "CANDIDATE" ? "/candidate/messages" : "/employer/messages";
  const applicationHref =
    role === "CANDIDATE"
      ? `/candidate/applications/${detail?.applicationId ?? ""}`
      : `/employer/applications/${detail?.applicationId ?? ""}`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-8">
      <Card className="flex min-h-[min(42rem,calc(100vh-7rem))] flex-1 flex-col gap-0">
        <CardHeader className="flex-row items-center gap-3 border-b py-4">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="К списку диалогов"
            title="К списку диалогов"
            render={<Link href={inboxHref} />}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          {conversationQuery.isPending ? (
            <Skeleton className="h-10 flex-1" />
          ) : conversationQuery.isError ? (
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Диалог недоступен</CardTitle>
              <p role="alert" className="mt-1 text-sm text-destructive">
                {normalizeApiError(conversationQuery.error).message}
              </p>
            </div>
          ) : detail ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <UserRound aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">
                  {detail.otherParticipant.displayName}
                </CardTitle>
                <span className="block truncate text-sm text-muted-foreground">
                  {detail.vacancyTitle}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => router.push(applicationHref)}
              >
                Отклик
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-0 p-0">
          {messagesQuery.isError ? (
            <div className="m-4 rounded-md border p-5 text-center">
              <p role="alert" className="text-sm text-destructive">
                {normalizeApiError(messagesQuery.error).message}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => void messagesQuery.refetch()}
              >
                Повторить
              </Button>
            </div>
          ) : messagesQuery.isPending ? (
            <div className="flex flex-1 flex-col justify-end gap-3 p-4">
              <Skeleton className="h-14 w-2/3 self-start" />
              <Skeleton className="h-14 w-2/3 self-end" />
              <Skeleton className="h-14 w-1/2 self-start" />
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5"
              aria-label="История переписки"
              aria-live="polite"
            >
              <div
                ref={olderMessagesRef}
                className="flex h-8 items-center justify-center text-xs text-muted-foreground"
              >
                {isFetchingNextPage
                  ? "Загружаем предыдущие сообщения…"
                  : hasNextPage
                    ? "Прокрутите вверх, чтобы загрузить историю"
                    : ""}
              </div>
              {messages.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Начните переписку — отправьте первое сообщение.
                </p>
              ) : (
                messages.map((message) => {
                  const ownMessage = message.senderId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
                    >
                      <article
                        className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                          ownMessage
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md bg-muted"
                        }`}
                      >
                        {!ownMessage && getSenderName(message) ? (
                          <p className="mb-1 text-xs font-medium opacity-75">
                            {getSenderName(message)}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {message.body}
                        </p>
                        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-70">
                          <time dateTime={message.createdAt}>
                            {formatMessageDate(message.createdAt)}
                          </time>
                          {ownMessage && message.readAt ? (
                            <span>Прочитано</span>
                          ) : null}
                        </div>
                      </article>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
          )}
          <form
            className="border-t p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            {retryRequest?.body === draft.trim() ? (
              <p className="mb-2 text-xs text-muted-foreground">
                Сообщение не отправлено. Повторите отправку, чтобы избежать
                дубликата.
              </p>
            ) : null}
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="message-draft">
                Текст сообщения
              </label>
              <textarea
                id="message-draft"
                className="min-h-11 max-h-36 min-w-0 flex-1 resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                placeholder="Напишите сообщение…"
                maxLength={5000}
                rows={1}
                value={draft}
                disabled={
                  sendMessage.isPending || !detail || conversationQuery.isError
                }
                onChange={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <Button
                type="submit"
                aria-label={
                  retryRequest?.body === draft.trim()
                    ? "Повторить отправку сообщения"
                    : "Отправить сообщение"
                }
                disabled={
                  !draft.trim() ||
                  sendMessage.isPending ||
                  !detail ||
                  conversationQuery.isError
                }
              >
                <Send aria-hidden="true" />
                <span className="hidden sm:inline">
                  {sendMessage.isPending
                    ? "Отправляем…"
                    : retryRequest?.body === draft.trim()
                      ? "Повторить"
                      : "Отправить"}
                </span>
              </Button>
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Enter — отправить, Shift+Enter — новая строка</span>
              <span>{draft.length}/5000</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
