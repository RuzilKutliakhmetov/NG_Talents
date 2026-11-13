import type {
  CertificationType,
  EmploymentType,
  PaginatedResponse,
  RequirementType,
  Vacancy,
  VacancyRegion,
  VacancyStatus,
  WorkFormat,
} from "@/types/api";

export interface EmployerCompany {
  id: string;
  inn: string;
  legalName: string;
  shortName: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  ogrn: string | null;
  kpp: string | null;
  legalAddress: string | null;
  logoStorageKey: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  verifiedById: string | null;
  dadataData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type EmployerCompanyCreateInput = Pick<
  EmployerCompany,
  "inn" | "legalName"
> &
  Partial<
    Pick<
      EmployerCompany,
      "shortName" | "description" | "website" | "email" | "phone" | "address"
    >
  >;

export type EmployerCompanyUpdateInput = Partial<
  Omit<EmployerCompanyCreateInput, "inn">
>;

export type ManagedVacancy = Vacancy & {
  status: VacancyStatus;
  moderationComment?: string | null;
  createdBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

export type ManagedVacancyList = PaginatedResponse<ManagedVacancy>;

export type VacancyManagementQuery = {
  page: number;
  limit: number;
  sort: "createdAt" | "salaryMin" | "salaryMax";
  direction: "asc" | "desc";
  status?: VacancyStatus;
};

export interface VacancyRequirementInput {
  text: string;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface VacancyCertificationInput {
  type: CertificationType;
  name?: string;
  isRequired?: boolean;
}

export interface VacancyWriteInput {
  title: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryGross?: boolean;
  employmentType: EmploymentType;
  workFormat?: WorkFormat;
  locationRegion: VacancyRegion;
  locationCity?: string;
  locationAddress?: string;
  schedule?: string;
  requirements?: string;
  conditions?: string;
  housingProvided?: boolean;
  travelProvided?: boolean;
  medicalInsurance?: boolean;
  requirementsList?: VacancyRequirementInput[];
  certifications?: VacancyCertificationInput[];
}

export type VacancyWriteUpdateInput = Partial<VacancyWriteInput>;

export type VacancyStatusAction =
  | "submit"
  | "pause"
  | "resume"
  | "close"
  | "archive";

export const VACANCY_STATUSES: VacancyStatus[] = [
  "DRAFT",
  "PENDING_MODERATION",
  "MODERATION",
  "PUBLISHED",
  "PAUSED",
  "CLOSED",
  "REJECTED",
  "ARCHIVED",
];

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "SHIFT",
  "PERMANENT",
  "PROJECT",
  "PART_TIME",
  "TEMPORARY",
];

export const WORK_FORMATS: WorkFormat[] = ["ONSITE", "HYBRID", "REMOTE"];

export const VACANCY_REGIONS: VacancyRegion[] = [
  "BASHKORTOSTAN",
  "KHMAO",
  "YANAO",
  "TATARSTAN",
  "OTHER",
];

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
