import { useQuery } from "@tanstack/react-query";

import { getPublicVacancies, getPublicVacancy } from "./api";
import type { VacancyListParams } from "./types";

export function usePublicVacancies(params: VacancyListParams) {
  return useQuery({
    queryKey: ["vacancies", "list", params],
    queryFn: () => getPublicVacancies(params),
    staleTime: 60_000,
    retry: false,
  });
}

export function usePublicVacancy(id: string, enabled = true) {
  return useQuery({
    queryKey: ["vacancies", "detail", id],
    queryFn: () => getPublicVacancy(id),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
