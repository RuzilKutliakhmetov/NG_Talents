export const notificationTypes = [
  "NEW_APPLICATION",
  "APPLICATION_STATUS_CHANGED",
  "NEW_MESSAGE",
  "VACANCY_PUBLISHED",
  "VACANCY_REJECTED",
  "EMPLOYER_VERIFIED",
  "SYSTEM",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  channel: "IN_APP";
  status: string;
  title: string;
  message: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationPreference {
  type: NotificationType;
  channel: "IN_APP";
  enabled: boolean;
}

export interface NotificationListParams {
  page: number;
  limit: number;
  unreadOnly: boolean;
}
