import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEmployerCompany,
  createManagedVacancy,
  employerKeys,
  getEmployerCompany,
  getManagedVacancies,
  getManagedVacancy,
  transitionManagedVacancy,
  updateEmployerCompany,
  updateManagedVacancy,
} from "./api";
import type {
  EmployerCompanyCreateInput,
  EmployerCompanyUpdateInput,
  VacancyManagementQuery,
  VacancyStatusAction,
  VacancyWriteInput,
  VacancyWriteUpdateInput,
} from "./types";

export function useEmployerCompany(id: string | null) {
  return useQuery({
    queryKey: id ? employerKeys.company(id) : ["employer", "company", null],
    queryFn: () => {
      if (!id) throw new Error("Employer ID is required.");
      return getEmployerCompany(id);
    },
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateEmployerCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployerCompanyCreateInput) =>
      createEmployerCompany(input),
    onSuccess: async (company) => {
      queryClient.setQueryData(employerKeys.company(company.id), company);
      await queryClient.invalidateQueries({ queryKey: ["employer"] });
    },
  });
}

export function useUpdateEmployerCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployerCompanyUpdateInput) =>
      updateEmployerCompany(id, input),
    onSuccess: async (company) => {
      queryClient.setQueryData(employerKeys.company(id), company);
      await queryClient.invalidateQueries({ queryKey: ["employer"] });
    },
  });
}

export function useManagedVacancies(
  employerId: string | null,
  query: VacancyManagementQuery,
) {
  return useQuery({
    queryKey: employerId
      ? employerKeys.vacancies(employerId, query)
      : ["employer", null, "vacancies", query],
    queryFn: () => {
      if (!employerId) throw new Error("Employer ID is required.");
      return getManagedVacancies(employerId, query);
    },
    enabled: Boolean(employerId),
    retry: false,
  });
}

export function useManagedVacancy(
  employerId: string | null,
  vacancyId: string,
) {
  return useQuery({
    queryKey: employerId
      ? employerKeys.vacancy(employerId, vacancyId)
      : ["employer", null, "vacancy", vacancyId],
    queryFn: () => {
      if (!employerId) throw new Error("Employer ID is required.");
      return getManagedVacancy(employerId, vacancyId);
    },
    enabled: Boolean(employerId && vacancyId),
    retry: false,
  });
}

function useRefreshEmployerVacancies(employerId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: ["employer", employerId, "vacancies"],
    });
}

export function useCreateManagedVacancy(employerId: string) {
  const invalidate = useRefreshEmployerVacancies(employerId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VacancyWriteInput) =>
      createManagedVacancy(employerId, input),
    onSuccess: async (vacancy) => {
      queryClient.setQueryData(
        employerKeys.vacancy(employerId, vacancy.id),
        vacancy,
      );
      await invalidate();
    },
  });
}

export function useUpdateManagedVacancy(
  employerId: string,
  vacancyId: string,
) {
  const invalidate = useRefreshEmployerVacancies(employerId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VacancyWriteUpdateInput) =>
      updateManagedVacancy(employerId, vacancyId, input),
    onSuccess: async (vacancy) => {
      queryClient.setQueryData(
        employerKeys.vacancy(employerId, vacancyId),
        vacancy,
      );
      await invalidate();
    },
  });
}

export function useVacancyStatusAction(
  employerId: string,
  vacancyId: string,
) {
  const invalidate = useRefreshEmployerVacancies(employerId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: VacancyStatusAction) =>
      transitionManagedVacancy(employerId, vacancyId, action),
    onSuccess: async (vacancy) => {
      queryClient.setQueryData(
        employerKeys.vacancy(employerId, vacancyId),
        vacancy,
      );
      await invalidate();
    },
  });
}
