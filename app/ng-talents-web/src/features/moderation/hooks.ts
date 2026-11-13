import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { employerKeys, getManagedVacancy } from "@/features/employer/api";

import {
  approveVacancy,
  getModerationQueue,
  getVacancyModerationAudit,
  rejectVacancy,
  startVacancyModeration,
} from "./api";
import type { ModerationQueueQuery, RejectVacancyInput } from "./types";

const moderationKeys = {
  queue: (query: ModerationQueueQuery) =>
    ["moderation", "queue", query] as const,
  audit: (vacancyId: string) =>
    ["moderation", "audit", vacancyId, { page: 1, limit: 20 }] as const,
};

export function useModerationQueue(query: ModerationQueueQuery) {
  return useQuery({
    queryKey: moderationKeys.queue(query),
    queryFn: () => getModerationQueue(query),
    retry: false,
  });
}

export function useModerationVacancy(
  employerId: string,
  vacancyId: string,
) {
  return useQuery({
    queryKey: employerKeys.vacancy(employerId, vacancyId),
    queryFn: () => getManagedVacancy(employerId, vacancyId),
    enabled: Boolean(employerId && vacancyId),
    retry: false,
  });
}

export function useVacancyModerationAudit(
  vacancyId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: moderationKeys.audit(vacancyId),
    queryFn: () => getVacancyModerationAudit(vacancyId),
    enabled: Boolean(vacancyId && enabled),
    retry: false,
  });
}

function useModerationMutation(
  employerId: string,
  vacancyId: string,
  mutationFn: (comment?: string) => Promise<Awaited<ReturnType<typeof getManagedVacancy>>>,
) {
  const queryClient = useQueryClient();
  const detailKey = employerKeys.vacancy(employerId, vacancyId);

  return useMutation({
    mutationFn: (comment?: string) => mutationFn(comment),
    onSuccess: async (vacancy) => {
      queryClient.setQueryData(detailKey, vacancy);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["employer", employerId, "vacancies"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["moderation", "queue"],
        }),
        queryClient.invalidateQueries({
          queryKey: moderationKeys.audit(vacancyId),
        }),
        queryClient.invalidateQueries({ queryKey: ["vacancies"] }),
      ]);
    },
  });
}

export function useStartVacancyModeration(
  employerId: string,
  vacancyId: string,
) {
  return useModerationMutation(employerId, vacancyId, () =>
    startVacancyModeration(vacancyId),
  );
}

export function useApproveVacancy(employerId: string, vacancyId: string) {
  return useModerationMutation(employerId, vacancyId, () =>
    approveVacancy(vacancyId),
  );
}

export function useRejectVacancy(employerId: string, vacancyId: string) {
  return useModerationMutation(employerId, vacancyId, (comment) => {
    if (!comment) throw new Error("Rejection comment is required.");
    const input: RejectVacancyInput = { comment };
    return rejectVacancy(vacancyId, input);
  });
}
