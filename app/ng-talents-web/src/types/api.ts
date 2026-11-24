export const USER_ROLES = [
  "CANDIDATE",
  "EMPLOYER",
  "ADMIN",
  "MODERATOR",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";

export interface ApiUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  role: UserRole;
  status: UserStatus;
  telegramId: string | null;
  telegramUsername: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenResponse {
  accessToken: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code?: string;
  message: string | string[];
  timestamp?: string;
  path?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: Pagination;
}

export type ApplicationStatus =
  | "NEW"
  | "VIEWED"
  | "IN_REVIEW"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export type VacancyStatus =
  | "DRAFT"
  | "PENDING_MODERATION"
  | "MODERATION"
  | "PUBLISHED"
  | "PAUSED"
  | "CLOSED"
  | "REJECTED"
  | "ARCHIVED";

export type EmploymentType =
  | "SHIFT"
  | "PERMANENT"
  | "PROJECT"
  | "PART_TIME"
  | "TEMPORARY";

export type WorkFormat = "ONSITE" | "HYBRID" | "REMOTE";

export type VacancyRegion =
  | "BASHKORTOSTAN"
  | "KHMAO"
  | "YANAO"
  | "TATARSTAN"
  | "OTHER";

export type CertificationType =
  | "A1"
  | "B1_1"
  | "ELECTRICAL_SAFETY"
  | "NAKS"
  | "OTHER";

export type RequirementType =
  | "EXPERIENCE"
  | "EDUCATION"
  | "CERTIFICATE"
  | "LICENSE"
  | "SAFETY"
  | "SKILL"
  | "OTHER";

export type VerificationStatus =
  | "NOT_VERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "REQUIRES_ATTENTION"
  | "REJECTED";

export interface EmployerSummary {
  id: string;
  legalName: string;
  shortName: string | null;
}

export interface Employer extends EmployerSummary {
  inn: string;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  ogrn: string | null;
  kpp: string | null;
  legalAddress: string | null;
  logoStorageKey: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  verifiedById: string | null;
  dadataData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface VacancyRequirement {
  id: string;
  vacancyId: string;
  type: RequirementType;
  name: string;
  description: string | null;
  required: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface VacancyCertification {
  id: string;
  vacancyId: string;
  type: CertificationType;
  name: string | null;
  required: boolean;
  createdAt: string;
}

export interface Vacancy {
  id: string;
  employerId: string;
  createdById: string;
  updatedById: string | null;
  title: string;
  slug: string | null;
  description: string;
  responsibilities: string | null;
  requirementsText: string | null;
  conditions: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryGross: boolean | null;
  employmentType: EmploymentType;
  workFormat: WorkFormat;
  locationRegion: VacancyRegion;
  locationCity: string | null;
  locationAddress: string | null;
  schedule: string | null;
  housingProvided: boolean;
  flightProvided: boolean;
  travelProvided: boolean;
  medicalInsurance: boolean;
  status?: VacancyStatus;
  moderationComment?: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  expiresAt: string | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  employer: EmployerSummary;
  requirements: VacancyRequirement[];
  certifications: VacancyCertification[];
}

export interface Application {
  id: string;
  vacancyId: string;
  candidateId: string;
  resumeId: string | null;
  status: ApplicationStatus;
  coverLetter: string | null;
  candidateComment: string | null;
  employerComment: string | null;
  appliedAt: string;
  viewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resumeSnapshot?: Record<string, unknown> | null;
}

export interface CandidateResumeSummary {
  id: string;
  title: string;
  desiredPosition?: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}
