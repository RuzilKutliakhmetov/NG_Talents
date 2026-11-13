import { apiClient } from "@/lib/api/client";

import type {
  EmployerCompany,
  EmployerCompanyCreateInput,
  EmployerCompanyUpdateInput,
  ManagedVacancy,
  ManagedVacancyList,
  VacancyManagementQuery,
  VacancyStatusAction,
  VacancyWriteInput,
  VacancyWriteUpdateInput,
} from "./types";

export const employerKeys = {
  company: (id: string) => ["employer", "company", id] as const,
  vacancies: (employerId: string, query: VacancyManagementQuery) =>
    ["employer", employerId, "vacancies", query] as const,
  vacancy: (employerId: string, vacancyId: string) =>
    ["employer", employerId, "vacancy", vacancyId] as const,
};

export async function getEmployerCompany(id: string) {
  const { data } = await apiClient.get<EmployerCompany>(
    `/employer/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function createEmployerCompany(input: EmployerCompanyCreateInput) {
  const { data } = await apiClient.post<EmployerCompany>("/employer", input);
  return data;
}

export async function updateEmployerCompany(
  id: string,
  input: EmployerCompanyUpdateInput,
) {
  const { data } = await apiClient.patch<EmployerCompany>(
    `/employer/${encodeURIComponent(id)}`,
    input,
  );
  return data;
}

export async function getManagedVacancies(
  employerId: string,
  query: VacancyManagementQuery,
) {
  const { data } = await apiClient.get<ManagedVacancyList>(
    `/employer/${encodeURIComponent(employerId)}/vacancies`,
    { params: query },
  );
  return data;
}

export async function getManagedVacancy(
  employerId: string,
  vacancyId: string,
) {
  const { data } = await apiClient.get<ManagedVacancy>(
    `/employer/${encodeURIComponent(employerId)}/vacancies/${encodeURIComponent(vacancyId)}`,
  );
  return data;
}

export async function createManagedVacancy(
  employerId: string,
  input: VacancyWriteInput,
) {
  const { data } = await apiClient.post<ManagedVacancy>(
    `/employer/${encodeURIComponent(employerId)}/vacancies`,
    input,
  );
  return data;
}

export async function updateManagedVacancy(
  employerId: string,
  vacancyId: string,
  input: VacancyWriteUpdateInput,
) {
  const { data } = await apiClient.patch<ManagedVacancy>(
    `/employer/${encodeURIComponent(employerId)}/vacancies/${encodeURIComponent(vacancyId)}`,
    input,
  );
  return data;
}

export async function transitionManagedVacancy(
  employerId: string,
  vacancyId: string,
  action: VacancyStatusAction,
) {
  if (action === "archive") {
    const { data } = await apiClient.delete<ManagedVacancy>(
      `/employer/${encodeURIComponent(employerId)}/vacancies/${encodeURIComponent(vacancyId)}`,
    );
    return data;
  }

  const { data } = await apiClient.post<ManagedVacancy>(
    `/employer/${encodeURIComponent(employerId)}/vacancies/${encodeURIComponent(vacancyId)}/${action}`,
  );
  return data;
}
