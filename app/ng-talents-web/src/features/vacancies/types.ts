import type {
  CertificationType,
  EmploymentType,
  PaginatedResponse,
  RequirementType,
  Vacancy,
  VacancyRegion,
  WorkFormat,
} from "@/types/api";

export type PublicVacancy = Omit<Vacancy, "status" | "moderationComment">;

export type VacancySort = "createdAt" | "salaryMin" | "salaryMax";
export type SortDirection = "asc" | "desc";

export interface VacancyListParams {
  title?: string;
  employmentType?: EmploymentType;
  locationRegion?: VacancyRegion;
  locationCity?: string;
  workFormat?: WorkFormat;
  salaryMin?: number;
  salaryMax?: number;
  certification?: CertificationType;
  page: number;
  limit: number;
  sort: VacancySort;
  direction: SortDirection;
}

export type VacancyListResponse = PaginatedResponse<PublicVacancy>;

export type VacancySearchParams = Record<
  string,
  string | string[] | undefined
>;

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "SHIFT",
  "PERMANENT",
  "PROJECT",
  "PART_TIME",
  "TEMPORARY",
];

export const VACANCY_REGIONS: VacancyRegion[] = [
  "BASHKORTOSTAN",
  "KHMAO",
  "YANAO",
  "TATARSTAN",
  "OTHER",
];

export const WORK_FORMATS: WorkFormat[] = ["ONSITE", "HYBRID", "REMOTE"];

export const CERTIFICATION_TYPES: CertificationType[] = [
  "A1",
  "B1_1",
  "ELECTRICAL_SAFETY",
  "NAKS",
  "OTHER",
];

export const REQUIREMENT_TYPES: RequirementType[] = [
  "EXPERIENCE",
  "EDUCATION",
  "CERTIFICATE",
  "LICENSE",
  "SAFETY",
  "SKILL",
  "OTHER",
];
