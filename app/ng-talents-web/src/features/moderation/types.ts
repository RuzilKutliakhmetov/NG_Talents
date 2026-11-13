import type { PaginatedResponse, VacancyStatus } from "@/types/api";

import type { ManagedVacancy } from "@/features/employer/types";

export type VacancyModerationAction =
  | "START_MODERATION"
  | "APPROVE"
  | "REJECT"
  | "RESUBMIT";

export interface ModerationAuditEntry {
  id: string;
  action: VacancyModerationAction;
  fromStatus: VacancyStatus | null;
  toStatus: VacancyStatus | null;
  comment: string | null;
  actor: {
    id: string;
    role: "ADMIN" | "MODERATOR";
  };
  createdAt: string;
}

export type ModerationAuditPage = PaginatedResponse<ModerationAuditEntry>;

export interface RejectVacancyInput {
  comment: string;
}

export type ModeratedVacancy = ManagedVacancy;

export interface ModerationQueueQuery {
  page: number;
  limit: number;
  status?: Extract<VacancyStatus, "PENDING_MODERATION" | "MODERATION">;
  search?: string;
}
