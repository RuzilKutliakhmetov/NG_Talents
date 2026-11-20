"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { toast } from "sonner";

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

import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationUnreadCount,
  useNotifications,
} from "../hooks";
import { getNotificationHref } from "../lib";
import { NotificationList } from "./notification-list";

export function NotificationsPage() {
  const router = useRouter();
  const role = authStore((state) => state.user?.role);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const params = { page, limit: 20, unreadOnly };
  const listQuery = useNotifications(params);
  const countQuery = useNotificationUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const handleOpen = async (id: string, href: string) => {
    try {
      await markRead.mutateAsync(id);
      if (unreadOnly && listQuery.data?.items.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }
      router.push(href);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markRead.mutateAsync(id);
      if (unreadOnly && listQuery.data?.items.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      if (unreadOnly) setPage(1);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      if (listQuery.data?.items.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const totalPages = listQuery.data?.pagination.totalPages ?? 0;
  const count = countQuery.data ?? 0;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Уведомления</CardTitle>
            <CardDescription className="mt-1">
              Непрочитанных: {count}
            </CardDescription>
            {countQuery.isError ? (
              <p className="mt-1 text-xs text-destructive">
                Не удалось обновить счётчик уведомлений.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<Link href="/notifications/preferences" />}
            >
              <Settings2 aria-hidden="true" />
              Настройки
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={count === 0 || markAllRead.isPending}
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck aria-hidden="true" />
              Прочитать все
            </Button>
          </div>
        </CardHeader>
        <CardContent className="gap-0 px-0 py-0">
          <div className="flex gap-2 border-b px-4 py-3">
            <Button
              type="button"
              size="sm"
              variant={!unreadOnly ? "secondary" : "ghost"}
              aria-pressed={!unreadOnly}
              onClick={() => {
                setPage(1);
                setUnreadOnly(false);
              }}
            >
              Все
            </Button>
            <Button
              type="button"
              size="sm"
              variant={unreadOnly ? "secondary" : "ghost"}
              aria-pressed={unreadOnly}
              onClick={() => {
                setPage(1);
                setUnreadOnly(true);
              }}
            >
              Непрочитанные
            </Button>
          </div>
          {listQuery.isPending ? (
            <div className="space-y-4 p-5" aria-label="Загружаем уведомления">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))}
            </div>
          ) : listQuery.isError ? (
            <div className="p-8 text-center">
              <p role="alert" className="text-sm text-destructive">
                {normalizeApiError(listQuery.error).message}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => void listQuery.refetch()}
              >
                Повторить
              </Button>
            </div>
          ) : (
            <NotificationList
              items={listQuery.data.items}
              deletingId={remove.isPending ? remove.variables : null}
              onOpen={(notification) =>
                void handleOpen(
                  notification.id,
                  getNotificationHref(notification, role),
                )
              }
              onMarkRead={(notification) =>
                void handleMarkRead(notification.id)
              }
              onDelete={(notification) =>
                void handleDelete(notification.id)
              }
            />
          )}
          {listQuery.data ? (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {listQuery.data.pagination.total === 0
                  ? "Нет уведомлений"
                  : `Страница ${page} из ${Math.max(totalPages, 1)} · ${listQuery.data.pagination.total} всего`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Предыдущая страница"
                  disabled={page <= 1 || listQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Следующая страница"
                  disabled={page >= totalPages || listQuery.isFetching}
                  onClick={() =>
                    setPage((current) =>
                      totalPages > 0 ? Math.min(totalPages, current + 1) : 1,
                    )
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
