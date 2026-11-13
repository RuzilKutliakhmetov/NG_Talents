import { apiClient } from "@/lib/api/client";

import type {
  ModerationAuditPage,
  ModerationQueueQuery,
  ModeratedVacancy,
  RejectVacancyInput,
} from "./types";
import type { ManagedVacancyList } from "@/features/employer/types";

export async function getModerationQueue(
  query: ModerationQueueQuery,
): Promise<ManagedVacancyList> {
  const { data } = await apiClient.get<ManagedVacancyList>(
    "/moderation/vacancies",
    { params: query },
  );
  return data;
}

export async function startVacancyModeration(
  vacancyId: string,
): Promise<ModeratedVacancy> {
  const { data } = await apiClient.post<ModeratedVacancy>(
    `/moderation/vacancies/${encodeURIComponent(vacancyId)}/start`,
  );
  return data;
}

export async function approveVacancy(
  vacancyId: string,
): Promise<ModeratedVacancy> {
  const { data } = await apiClient.post<ModeratedVacancy>(
    `/moderation/vacancies/${encodeURIComponent(vacancyId)}/approve`,
  );
  return data;
}

export async function rejectVacancy(
  vacancyId: string,
  input: RejectVacancyInput,
): Promise<ModeratedVacancy> {
  const { data } = await apiClient.post<ModeratedVacancy>(
    `/moderation/vacancies/${encodeURIComponent(vacancyId)}/reject`,
    input,
  );
  return data;
}

export async function getVacancyModerationAudit(
  vacancyId: string,
  page = 1,
  limit = 20,
): Promise<ModerationAuditPage> {
  const { data } = await apiClient.get<ModerationAuditPage>(
    `/moderation/vacancies/${encodeURIComponent(vacancyId)}/audit`,
    { params: { page, limit } },
  );
  return data;
}
