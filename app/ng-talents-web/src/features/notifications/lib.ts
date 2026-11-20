import type { UserRole } from "@/types/api";

import type { Notification } from "./types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getNotificationHref(
  notification: Notification,
  role: UserRole | undefined,
): string {
  const data = notification.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "/notifications";
  }

  const entity = data as Record<string, unknown>;
  const id = entity.entityId;
  if (typeof id !== "string" || !uuidPattern.test(id)) {
    return "/notifications";
  }

  switch (entity.entityType) {
    case "application":
      if (role === "CANDIDATE") return `/candidate/applications/${id}`;
      if (role === "EMPLOYER") return `/employer/applications/${id}`;
      return "/notifications";
    case "vacancy":
      return role === "EMPLOYER"
        ? `/employer/vacancies/${id}/edit`
        : "/notifications";
    case "conversation":
      if (role === "CANDIDATE") return `/candidate/messages/${id}`;
      if (role === "EMPLOYER") return `/employer/messages/${id}`;
      return "/notifications";
    default:
      return "/notifications";
  }
}

export function formatNotificationDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
