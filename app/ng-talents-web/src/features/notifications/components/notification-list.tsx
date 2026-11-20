"use client";

import { Bell, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatNotificationDate } from "../lib";
import type { Notification } from "../types";

interface NotificationListProps {
  items: Notification[];
  compact?: boolean;
  deletingId?: string | null;
  onOpen: (notification: Notification) => void;
  onMarkRead: (notification: Notification) => void;
  onDelete: (notification: Notification) => void;
}

export function NotificationList({
  items,
  compact = false,
  deletingId,
  onOpen,
  onMarkRead,
  onDelete,
}: NotificationListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <Bell aria-hidden="true" className="size-8 opacity-50" />
        <p>Уведомлений пока нет.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((notification) => (
        <li
          key={notification.id}
          className={`flex gap-3 px-4 py-4 ${
            notification.readAt ? "bg-background" : "bg-primary/[0.035]"
          }`}
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpen(notification)}
            aria-label={`Открыть уведомление: ${notification.title}`}
          >
            <span className="flex items-start gap-2">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {notification.title}
                  </span>
                  {!notification.readAt ? (
                    <span
                      aria-label="Непрочитано"
                      className="size-2 shrink-0 rounded-full bg-primary"
                    />
                  ) : null}
                </span>
                <span className="mt-1 block whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {notification.message}
                </span>
                <time
                  className="mt-2 block text-xs text-muted-foreground"
                  dateTime={notification.createdAt}
                >
                  {formatNotificationDate(notification.createdAt)}
                </time>
              </span>
            </span>
          </button>
          <div className="flex shrink-0 flex-col gap-1">
            {!notification.readAt && !compact ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Отметить прочитанным"
                title="Отметить прочитанным"
                onClick={() => onMarkRead(notification)}
              >
                <Check aria-hidden="true" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Удалить уведомление"
              title="Удалить уведомление"
              disabled={deletingId === notification.id}
              onClick={() => onDelete(notification)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
