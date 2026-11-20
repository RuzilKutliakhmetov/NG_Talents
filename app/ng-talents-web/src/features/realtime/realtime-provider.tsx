"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";

import { authStore } from "@/features/auth/store";
import { refreshSessionAccessToken } from "@/features/auth/api";
import { notificationKeys } from "@/features/notifications/hooks";
import { conversationKeys } from "@/features/messages/hooks";

interface RealtimeProviderProps {
  children: ReactNode;
}

interface CountPayload {
  count: number;
}

interface NewMessagePayload {
  conversationId: string;
  message: { id: string };
}

interface MessageReadPayload {
  conversationId: string;
  readerId: string;
  updated: number;
}

function isCountPayload(value: unknown): value is CountPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    Number.isFinite(value.count)
  );
}

function isNewMessagePayload(value: unknown): value is NewMessagePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "conversationId" in value &&
    typeof value.conversationId === "string" &&
    "message" in value &&
    typeof value.message === "object" &&
    value.message !== null &&
    "id" in value.message &&
    typeof value.message.id === "string"
  );
}

function isMessageReadPayload(value: unknown): value is MessageReadPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "conversationId" in value &&
    typeof value.conversationId === "string" &&
    "readerId" in value &&
    typeof value.readerId === "string" &&
    "updated" in value &&
    typeof value.updated === "number"
  );
}

function getTokenExpiration(token: string): number {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Access token has no payload.");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  let decoded: unknown;
  try {
    decoded = JSON.parse(window.atob(padded));
  } catch {
    throw new Error("Access token payload is invalid.");
  }
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("exp" in decoded) ||
    typeof decoded.exp !== "number"
  ) {
    throw new Error("Access token has no expiration claim.");
  }
  return decoded.exp * 1000;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const userId = authStore((state) => state.user?.id ?? null);
  const accessToken = authStore((state) => state.accessToken);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousUserId.current;
    if (previous && previous !== userId) {
      queryClient.removeQueries({
        queryKey: [...notificationKeys.all, previous],
      });
      queryClient.removeQueries({
        queryKey: [...conversationKeys.all, previous],
      });
    }
    previousUserId.current = userId;
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId || !accessToken) return;

    let disposed = false;
    let expiration: number;
    try {
      expiration = getTokenExpiration(accessToken);
    } catch {
      queryClient.clear();
      authStore.getState().clearSession();
      toast.error("Не удалось проверить сессию. Войдите снова.");
      return;
    }
    const refreshDelay = expiration - Date.now() - 30_000;

    const refreshBeforeConnect = async () => {
      try {
        await refreshSessionAccessToken(userId);
      } catch {
        if (!disposed) {
          toast.error("Сессия завершилась. Войдите снова.");
        }
      }
    };

    if (refreshDelay <= 0) {
      void refreshBeforeConnect();
      return () => {
        disposed = true;
      };
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBaseUrl) {
      throw new Error("Не задана переменная окружения NEXT_PUBLIC_API_URL.");
    }

    const socketOrigin = new URL(apiBaseUrl, window.location.origin).origin;
    const socket: Socket = io(`${socketOrigin}/events`, {
      autoConnect: false,
      auth: { token: accessToken },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const syncUserQueries = () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.unreadCount(userId),
      });
    };

    const handleNotification = (payload: unknown) => {
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("id" in payload) ||
        typeof payload.id !== "string"
      ) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(userId),
      });
    };

    const handleNotificationCount = (payload: unknown) => {
      if (!isCountPayload(payload)) return;
      queryClient.setQueryData(
        notificationKeys.unreadCount(userId),
        payload.count,
      );
    };

    const handleMessageCount = (payload: unknown) => {
      if (!isCountPayload(payload)) return;
      queryClient.setQueryData(
        conversationKeys.unreadCount(userId),
        payload.count,
      );
    };

    const handleNewMessage = (payload: unknown) => {
      if (!isNewMessagePayload(payload)) return;
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(userId, payload.conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.unreadCount(userId),
      });
    };

    const handleMessageRead = (payload: unknown) => {
      if (!isMessageReadPayload(payload)) return;
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(userId, payload.conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(userId),
      });
    };

    const handleDisconnect = (reason: string) => {
      if (reason !== "io server disconnect") return;
      queryClient.clear();
      authStore.getState().clearSession();
      toast.error("Сервер завершил сессию. Войдите снова.");
    };

    socket.on("connect", syncUserQueries);
    socket.on("disconnect", handleDisconnect);
    socket.on("notifications:new", handleNotification);
    socket.on("notifications:unread_count", handleNotificationCount);
    socket.on("messages:new", handleNewMessage);
    socket.on("messages:unread_count", handleMessageCount);
    socket.on("messages:read", handleMessageRead);
    socket.connect();

    const refreshTimer = setTimeout(() => {
      void refreshSessionAccessToken(userId).catch(() => {
        if (!disposed) {
          toast.error("Сессия завершилась. Войдите снова.");
        }
      });
    }, refreshDelay);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncUserQueries();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      socket.off("connect", syncUserQueries);
      socket.off("disconnect", handleDisconnect);
      socket.off("notifications:new", handleNotification);
      socket.off("notifications:unread_count", handleNotificationCount);
      socket.off("messages:new", handleNewMessage);
      socket.off("messages:unread_count", handleMessageCount);
      socket.off("messages:read", handleMessageRead);
      socket.disconnect();
    };
  }, [accessToken, queryClient, userId]);

  return children;
}
