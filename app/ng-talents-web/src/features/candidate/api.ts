import { apiClient } from "@/lib/api/client";

import type {
  CandidateProfile,
  CandidateProfileUpdateInput,
  StructuredResume,
  StructuredResumeInput,
} from "./types";

export async function getCandidateProfile(): Promise<CandidateProfile> {
  const { data } = await apiClient.get<CandidateProfile>("/candidate/profile");
  return data;
}

export async function createCandidateProfile(
  input: Partial<CandidateProfile>,
): Promise<CandidateProfile> {
  const { data } = await apiClient.post<CandidateProfile>(
    "/candidate/profile",
    input,
  );
  return data;
}

export async function updateCandidateProfile(
  input: CandidateProfileUpdateInput,
): Promise<CandidateProfile> {
  const { data } = await apiClient.patch<CandidateProfile>(
    "/candidate/profile",
    input,
  );
  return data;
}

export async function getStructuredResumes(): Promise<StructuredResume[]> {
  const { data } =
    await apiClient.get<StructuredResume[]>("/candidate/resumes");
  return data;
}

export async function getStructuredResume(
  id: string,
): Promise<StructuredResume> {
  const { data } = await apiClient.get<StructuredResume>(
    `/candidate/resumes/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function createStructuredResume(
  input: StructuredResumeInput,
): Promise<StructuredResume> {
  const { data } = await apiClient.post<StructuredResume>(
    "/candidate/resumes/structured",
    input,
  );
  return data;
}

export async function updateStructuredResume(
  id: string,
  input: StructuredResumeInput,
): Promise<StructuredResume> {
  const { data } = await apiClient.patch<StructuredResume>(
    `/candidate/resumes/${encodeURIComponent(id)}/structured`,
    input,
  );
  return data;
}

export async function publishResume(id: string): Promise<StructuredResume> {
  const { data } = await apiClient.post<StructuredResume>(
    `/candidate/resumes/${encodeURIComponent(id)}/publish`,
  );
  return data;
}

export async function unpublishResume(id: string): Promise<StructuredResume> {
  const { data } = await apiClient.post<StructuredResume>(
    `/candidate/resumes/${encodeURIComponent(id)}/unpublish`,
  );
  return data;
}

export async function archiveResume(id: string): Promise<StructuredResume> {
  const { data } = await apiClient.post<StructuredResume>(
    `/candidate/resumes/${encodeURIComponent(id)}/archive`,
  );
  return data;
}

export async function copyResume(id: string): Promise<StructuredResume> {
  const { data } = await apiClient.post<StructuredResume>(
    `/candidate/resumes/${encodeURIComponent(id)}/copy`,
  );
  return data;
}

export async function deleteResume(id: string): Promise<{ success: true }> {
  const { data } = await apiClient.delete<{ success: true }>(
    `/candidate/resumes/${encodeURIComponent(id)}`,
  );
  return data;
}
