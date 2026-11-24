"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authStore } from "@/features/auth/store";

import {
  archiveResume,
  copyResume,
  createStructuredResume,
  deleteResume,
  getCandidateProfile,
  getStructuredResume,
  getStructuredResumes,
  publishResume,
  unpublishResume,
  updateCandidateProfile,
  updateStructuredResume,
} from "./api";
import type {
  CandidateProfileUpdateInput,
  StructuredResumeInput,
} from "./types";

export const candidateKeys = {
  all: ["candidate"] as const,
  profile: (userId: string | null) =>
    [...candidateKeys.all, userId, "profile"] as const,
  resumes: (userId: string | null) =>
    [...candidateKeys.all, userId, "resumes"] as const,
  resume: (userId: string | null, id: string) =>
    [...candidateKeys.resumes(userId), id] as const,
};

function useCurrentUserId() {
  return authStore((state) => state.user?.id ?? null);
}

export function useCandidateProfile() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: candidateKeys.profile(userId),
    queryFn: getCandidateProfile,
    enabled: Boolean(userId),
  });
}

export function useSaveCandidateProfile() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: CandidateProfileUpdateInput) =>
      updateCandidateProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: candidateKeys.profile(userId),
      });
    },
  });
}

export function useStructuredResumes() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: candidateKeys.resumes(userId),
    queryFn: getStructuredResumes,
    enabled: Boolean(userId),
  });
}

export function useStructuredResume(id: string) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: candidateKeys.resume(userId, id),
    queryFn: () => getStructuredResume(id),
    enabled: Boolean(userId && id),
  });
}

function useResumeAction<T>(mutationFn: (id: string) => Promise<T>) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: candidateKeys.resumes(userId),
      });
    },
  });
}

export function useCreateStructuredResume() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: StructuredResumeInput) => createStructuredResume(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: candidateKeys.resumes(userId),
      });
    },
  });
}

export function useUpdateStructuredResume(id: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (input: StructuredResumeInput) =>
      updateStructuredResume(id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: candidateKeys.resume(userId, id),
        }),
        queryClient.invalidateQueries({
          queryKey: candidateKeys.resumes(userId),
        }),
      ]);
    },
  });
}

export const usePublishResume = () => useResumeAction(publishResume);
export const useUnpublishResume = () => useResumeAction(unpublishResume);
export const useArchiveResume = () => useResumeAction(archiveResume);
export const useCopyResume = () => useResumeAction(copyResume);
export const useDeleteResume = () => useResumeAction(deleteResume);
