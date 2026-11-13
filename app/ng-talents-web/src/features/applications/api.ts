import { apiClient } from "@/lib/api/client";
import type {
  CandidateApplication,
  CandidateApplicationDetail,
  CandidateApplicationQuery,
  CreateApplicationInput,
  EmployerApplication,
  EmployerApplicationDetail,
  EmployerApplicationQuery,
  ApplicationHistoryEntry,
  ApplicationListResponse,
  ApplicationStatusInput,
} from "./types";
import type { CandidateResumeSummary } from "@/types/api";
import type { Application } from "@/types/api";

export async function createApplication(input: CreateApplicationInput) {
  const { data } = await apiClient.post<Application>(
    "/applications",
    input,
  );
  return data;
}

export async function getCandidateApplications(
  query: CandidateApplicationQuery,
) {
  const { data } = await apiClient.get<
    ApplicationListResponse<CandidateApplication>
  >("/applications/my", { params: query });
  return data;
}

export async function getCandidateApplication(id: string) {
  const { data } = await apiClient.get<CandidateApplicationDetail>(
    `/applications/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function withdrawCandidateApplication(id: string) {
  const { data } = await apiClient.post<Application>(
    `/applications/${encodeURIComponent(id)}/withdraw`,
  );
  return data;
}

export async function getCandidateApplicationHistory(id: string) {
  const { data } = await apiClient.get<ApplicationHistoryEntry[]>(
    `/applications/${encodeURIComponent(id)}/history`,
  );
  return data;
}

export async function getCandidateResumes() {
  const { data } = await apiClient.get<CandidateResumeSummary[]>(
    "/candidate/resumes",
  );
  return data;
}

export async function getEmployerApplications(
  employerId: string,
  query: EmployerApplicationQuery,
) {
  const { data } = await apiClient.get<
    ApplicationListResponse<EmployerApplication>
  >(`/employer/${encodeURIComponent(employerId)}/applications`, {
    params: query,
  });
  return data;
}

export async function getEmployerApplication(
  employerId: string,
  applicationId: string,
) {
  const { data } = await apiClient.get<EmployerApplicationDetail>(
    `/employer/${encodeURIComponent(employerId)}/applications/${encodeURIComponent(applicationId)}`,
  );
  return data;
}

export async function markEmployerApplicationViewed(
  employerId: string,
  applicationId: string,
) {
  const { data } = await apiClient.post<Application>(
    `/employer/${encodeURIComponent(employerId)}/applications/${encodeURIComponent(applicationId)}/view`,
  );
  return data;
}

export async function updateEmployerApplicationStatus(
  employerId: string,
  applicationId: string,
  input: ApplicationStatusInput,
) {
  const { data } = await apiClient.post<Application>(
    `/employer/${encodeURIComponent(employerId)}/applications/${encodeURIComponent(applicationId)}/status`,
    input,
  );
  return data;
}

export async function updateEmployerApplicationComment(
  employerId: string,
  applicationId: string,
  comment: string,
) {
  const { data } = await apiClient.patch<Application>(
    `/employer/${encodeURIComponent(employerId)}/applications/${encodeURIComponent(applicationId)}/comment`,
    { comment },
  );
  return data;
}

export async function getEmployerApplicationHistory(
  employerId: string,
  applicationId: string,
) {
  const { data } = await apiClient.get<ApplicationHistoryEntry[]>(
    `/employer/${encodeURIComponent(employerId)}/applications/${encodeURIComponent(applicationId)}/history`,
  );
  return data;
}
