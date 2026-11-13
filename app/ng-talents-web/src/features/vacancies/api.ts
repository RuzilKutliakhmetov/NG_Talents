import { apiClient } from "@/lib/api/client";

import type {
  PublicVacancy,
  VacancyListParams,
  VacancyListResponse,
} from "./types";

export async function getPublicVacancies(
  params: VacancyListParams,
): Promise<VacancyListResponse> {
  const { data } = await apiClient.get<VacancyListResponse>("/vacancies", {
    params,
  });
  return data;
}

export async function getPublicVacancy(id: string): Promise<PublicVacancy> {
  const { data } = await apiClient.get<PublicVacancy>(
    `/vacancies/${encodeURIComponent(id)}`,
  );
  return data;
}
