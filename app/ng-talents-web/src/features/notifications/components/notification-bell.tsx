"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authStore } from "@/features/auth/store";
import { normalizeApiError } from "@/lib/api/api-error";

import { getNotificationHref } from "../lib";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationUnreadCount,
  useNotifications,
} from "../hooks";
import type { Notification } from "../types";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const role = authStore((state) => state.user?.role);
  const listQuery = useNotifications({ page: 1, limit: 6, unreadOnly: false });
  const countQuery = useNotificationUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const openNotification = async (notification: Notification) => {
    try {
      if (!notification.readAt) await markRead.mutateAsync(notification.id);
      setOpen(false);
      router.push(getNotificationHref(notification, role));
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const deleteNotification = async (notification: Notification) => {
    try {
      await remove.mutateAsync(notification.id);
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const markEveryNotificationRead = async () => {
    try {
      await markAllRead.mutateAsync();
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const count = countQuery.data ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={
              count > 0
                ? `Уведомления, непрочитанных: ${count}`
                : "Уведомления"
            }
            className="relative"
          />
        }
      >
        <Bell aria-hidden="true" />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-destructive px-1 text-center text-[10px] leading-5 text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Уведомления</SheetTitle>
          <SheetDescription>
            Новые события по откликам, вакансиям и сообщениям.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Непрочитанных: {count}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={count === 0 || markAllRead.isPending}
              onClick={() => void markEveryNotificationRead()}
            >
              <CheckCheck aria-hidden="true" />
              Прочитать все
            </Button>
          </div>
          {countQuery.isError ? (
            <p role="alert" className="px-4 pb-3 text-xs text-destructive">
              Не удалось обновить счётчик уведомлений.
            </p>
          ) : null}
          {listQuery.isPending ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Загружаем уведомления…
            </p>
          ) : listQuery.isError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-destructive">
                {normalizeApiError(listQuery.error).message}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void listQuery.refetch()}
              >
                Повторить
              </Button>
            </div>
          ) : (
            <NotificationList
              compact
              items={listQuery.data.items}
              deletingId={remove.isPending ? remove.variables : null}
              onOpen={(notification) => void openNotification(notification)}
              onMarkRead={(notification) => {
                markRead.mutate(notification.id, {
                  onError: (error) =>
                    toast.error(normalizeApiError(error).message),
                });
              }}
              onDelete={(notification) => void deleteNotification(notification)}
            />
          )}
        </div>
        <div className="flex gap-2 border-t p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setOpen(false);
              router.push("/notifications");
            }}
          >
            Все уведомления
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Настройки уведомлений"
            title="Настройки уведомлений"
            onClick={() => {
              setOpen(false);
              router.push("/notifications/preferences");
            }}
          >
            <Settings2 aria-hidden="true" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
