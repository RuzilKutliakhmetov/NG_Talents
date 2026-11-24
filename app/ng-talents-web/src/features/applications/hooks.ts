import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createApplication,
  getCandidateApplication,
  getCandidateApplicationHistory,
  getCandidateApplications,
  getCandidateResumes,
  getEmployerApplication,
  getEmployerApplicationHistory,
  getEmployerApplications,
  markEmployerApplicationViewed,
  updateEmployerApplicationStatus,
  updateEmployerApplicationComment,
  getEmployerApplicationResume,
  withdrawCandidateApplication,
} from "./api";
import type {
  ApplicationStatusInput,
  CandidateApplicationQuery,
  CreateApplicationInput,
  EmployerApplicationQuery,
} from "./types";

export const applicationKeys = {
  candidateLists: ["applications", "candidate", "list"] as const,
  candidateList: (query: CandidateApplicationQuery) =>
    ["applications", "candidate", "list", query] as const,
  candidateDetail: (id: string) =>
    ["applications", "candidate", "detail", id] as const,
  candidateHistory: (id: string) =>
    ["applications", "candidate", "history", id] as const,
  resumes: ["applications", "candidate", "resumes"] as const,
  employerLists: (employerId: string) =>
    ["applications", "employer", employerId, "list"] as const,
  employerList: (employerId: string, query: EmployerApplicationQuery) =>
    ["applications", "employer", employerId, "list", query] as const,
  employerDetail: (employerId: string, applicationId: string) =>
    ["applications", "employer", employerId, "detail", applicationId] as const,
  employerHistory: (employerId: string, applicationId: string) =>
    ["applications", "employer", employerId, "history", applicationId] as const,
};

export function useCandidateApplications(query: CandidateApplicationQuery) {
  return useQuery({
    queryKey: applicationKeys.candidateList(query),
    queryFn: () => getCandidateApplications(query),
    retry: false,
  });
}

export function useCandidateApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.candidateDetail(id),
    queryFn: () => getCandidateApplication(id),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCandidateApplicationHistory(id: string) {
  return useQuery({
    queryKey: applicationKeys.candidateHistory(id),
    queryFn: () => getCandidateApplicationHistory(id),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCandidateResumes(enabled: boolean) {
  return useQuery({
    queryKey: applicationKeys.resumes,
    queryFn: getCandidateResumes,
    enabled,
    retry: false,
  });
}

export function useVacancyApplication(vacancyId: string, enabled: boolean) {
  const query: CandidateApplicationQuery = {
    page: 1,
    limit: 1,
    sort: "appliedAt",
    direction: "desc",
    vacancyId,
  };
  return useQuery({
    queryKey: applicationKeys.candidateList(query),
    queryFn: () => getCandidateApplications(query),
    enabled: Boolean(vacancyId && enabled),
    retry: false,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) => createApplication(input),
    onSuccess: async (application) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: applicationKeys.candidateLists,
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.candidateDetail(application.id),
        }),
      ]);
    },
  });
}

export function useWithdrawCandidateApplication(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => withdrawCandidateApplication(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: applicationKeys.candidateLists,
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.candidateDetail(id),
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.candidateHistory(id),
        }),
      ]);
    },
  });
}

export function useEmployerApplications(
  employerId: string | null,
  query: EmployerApplicationQuery,
) {
  return useQuery({
    queryKey: employerId
      ? applicationKeys.employerList(employerId, query)
      : ["applications", "employer", null, "list", query],
    queryFn: () => {
      if (!employerId) throw new Error("Employer ID is required.");
      return getEmployerApplications(employerId, query);
    },
    enabled: Boolean(employerId),
    retry: false,
  });
}

export function useEmployerApplication(
  employerId: string | null,
  applicationId: string,
) {
  return useQuery({
    queryKey: employerId
      ? applicationKeys.employerDetail(employerId, applicationId)
      : ["applications", "employer", null, "detail", applicationId],
    queryFn: () => {
      if (!employerId) throw new Error("Employer ID is required.");
      return getEmployerApplication(employerId, applicationId);
    },
    enabled: Boolean(employerId && applicationId),
    retry: false,
  });
}

export function useEmployerApplicationHistory(
  employerId: string,
  applicationId: string,
) {
  return useQuery({
    queryKey: applicationKeys.employerHistory(employerId, applicationId),
    queryFn: () => getEmployerApplicationHistory(employerId, applicationId),
    enabled: Boolean(employerId && applicationId),
    retry: false,
  });
}

export function useEmployerApplicationResume(
  employerId: string,
  applicationId: string,
) {
  return useQuery({
    queryKey: [
      ...applicationKeys.employerDetail(employerId, applicationId),
      "resume",
    ],
    queryFn: () =>
      getEmployerApplicationResume(employerId, applicationId),
    enabled: Boolean(employerId && applicationId),
    retry: false,
  });
}

function useEmployerApplicationMutation<TVariables, TResult>(
  employerId: string,
  applicationId: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: applicationKeys.employerLists(employerId),
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.employerDetail(employerId, applicationId),
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.employerHistory(employerId, applicationId),
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.candidateLists,
        }),
      ]);
    },
  });
}

export function useMarkEmployerApplicationViewed(
  employerId: string,
  applicationId: string,
) {
  return useEmployerApplicationMutation(employerId, applicationId, () =>
    markEmployerApplicationViewed(employerId, applicationId),
  );
}

export function useUpdateEmployerApplicationStatus(
  employerId: string,
  applicationId: string,
) {
  return useEmployerApplicationMutation(
    employerId,
    applicationId,
    (input: ApplicationStatusInput) =>
      updateEmployerApplicationStatus(employerId, applicationId, input),
  );
}

export function useUpdateEmployerApplicationComment(
  employerId: string,
  applicationId: string,
) {
  return useEmployerApplicationMutation(
    employerId,
    applicationId,
    (comment: string) =>
      updateEmployerApplicationComment(employerId, applicationId, comment),
  );
}
