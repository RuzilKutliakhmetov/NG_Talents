"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authStore } from "@/features/auth/store";

import {
  deleteNotification,
  getNotificationPreferences,
  getNotificationUnreadCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
} from "./api";
import type { NotificationListParams } from "./types";

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: (userId: string | null) =>
    [...notificationKeys.all, userId, "list"] as const,
  list: (userId: string | null, params: NotificationListParams) =>
    [...notificationKeys.lists(userId), params] as const,
  unreadCount: (userId: string | null) =>
    [...notificationKeys.all, userId, "unread-count"] as const,
  preferences: (userId: string | null) =>
    [...notificationKeys.all, userId, "preferences"] as const,
};

function useCurrentUserId() {
  return authStore((state) => state.user?.id ?? null);
}

export function useNotifications(params: NotificationListParams) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: notificationKeys.list(userId, params),
    queryFn: () => getNotifications(params),
    enabled: Boolean(userId),
  });
}

export function useNotificationUnreadCount() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    queryFn: getNotificationUnreadCount,
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.lists(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(userId),
        }),
      ]);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.lists(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(userId),
        }),
      ]);
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.lists(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(userId),
        }),
      ]);
    },
  });
}

export function useNotificationPreferences() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: notificationKeys.preferences(userId),
    queryFn: getNotificationPreferences,
    enabled: Boolean(userId),
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: updateNotificationPreference,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(userId),
      });
    },
  });
}
