import { apiClient } from "@/lib/api/client";

import type {
  Notification,
  NotificationListParams,
  NotificationPage,
  NotificationPreference,
  NotificationType,
} from "./types";

export async function getNotifications(
  params: NotificationListParams,
): Promise<NotificationPage> {
  const { data } = await apiClient.get<NotificationPage>("/notifications", {
    params,
  });
  return data;
}

export async function getNotificationUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return data.count;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(
    `/notifications/${encodeURIComponent(id)}/read`,
  );
  return data;
}

export async function markAllNotificationsRead(): Promise<{
  updated: number;
  unreadCount: number;
}> {
  const { data } = await apiClient.patch<{
    updated: number;
    unreadCount: number;
  }>("/notifications/read-all");
  return data;
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${encodeURIComponent(id)}`);
}

export async function getNotificationPreferences(): Promise<
  NotificationPreference[]
> {
  const { data } = await apiClient.get<NotificationPreference[]>(
    "/notifications/preferences",
  );
  return data;
}

export async function updateNotificationPreference(input: {
  type: NotificationType;
  enabled: boolean;
}): Promise<NotificationPreference> {
  const { data } = await apiClient.patch<NotificationPreference>(
    "/notifications/preferences",
    input,
  );
  return data;
}
