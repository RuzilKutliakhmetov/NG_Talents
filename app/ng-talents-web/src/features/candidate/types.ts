export type ResumeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type EmploymentType =
  "SHIFT" | "PERMANENT" | "PROJECT" | "PART_TIME" | "TEMPORARY";
export type WorkFormat = "ONSITE" | "HYBRID" | "REMOTE";
export type LanguageLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "NATIVE";
export type CandidateCertificationType =
  "A1" | "B1_1" | "ELECTRICAL_SAFETY" | "NAKS" | "COURSE" | "OTHER";

export interface CandidateProfile {
  id: string;
  userId: string;
  birthDate: string | null;
  citizenship: string | null;
  city: string | null;
  region: string | null;
  desiredPosition: string | null;
  specialization: string | null;
  readyForShift: boolean;
  readyForShiftWork: boolean;
  shiftSchedule: string | null;
  preferredSchedule: string | null;
  employmentType: EmploymentType | null;
  workFormat: WorkFormat | null;
  about: string | null;
  experienceYears: number | null;
  education: string | null;
  readyToRelocate: boolean;
  readyForTrips: boolean;
  showContacts: boolean;
  hideFromEmployers: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  experiences: CandidateExperience[];
  educations: CandidateEducation[];
  certifications: CandidateCertification[];
  languages: CandidateProfileLanguage[];
  portfolioLinks: CandidateProfilePortfolioLink[];
}

export interface CandidateExperience {
  id: string;
  companyName: string;
  position: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  achievements: string | null;
  technologies: string[];
  sortOrder: number;
}

export interface CandidateEducation {
  id: string;
  institution: string;
  faculty: string | null;
  specialization: string;
  degree: string | null;
  startDate: string | null;
  endDate: string | null;
  isIncomplete: boolean;
  description: string | null;
  sortOrder: number;
}

export interface CandidateCertification {
  id: string;
  type: CandidateCertificationType;
  name: string;
  number: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  issuer: string | null;
}

export interface CandidateProfileLanguage {
  id: string;
  name: string;
  level: LanguageLevel;
  sortOrder: number;
}

export interface CandidateProfilePortfolioLink {
  id: string;
  title: string;
  description: string | null;
  url: string;
  technologies: string[];
  sortOrder: number;
}

export interface ResumeExperience {
  id: string;
  companyName: string;
  position: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  achievements: string | null;
  technologies: string[];
  sortOrder: number;
}

export interface ResumeEducation {
  id: string;
  institution: string;
  faculty: string | null;
  specialization: string;
  degree: string | null;
  startDate: string | null;
  endDate: string | null;
  isIncomplete: boolean;
  description: string | null;
  sortOrder: number;
}

export interface ResumeSkill {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
  sortOrder: number;
}

export interface ResumeLanguage {
  id: string;
  name: string;
  level: LanguageLevel;
  sortOrder: number;
}

export interface ResumeCertification {
  id: string;
  name: string;
  issuer: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  url: string | null;
  sortOrder: number;
}

export interface ResumePortfolioLink {
  id: string;
  title: string;
  description: string | null;
  url: string;
  technologies: string[];
  sortOrder: number;
}

export interface StructuredResume {
  id: string;
  title: string;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  isPrimary: boolean;
  status: ResumeStatus;
  desiredPosition: string | null;
  specialization: string | null;
  summary: string | null;
  experienceYears: number | null;
  desiredSalary: number | null;
  employmentType: EmploymentType | null;
  workSchedule: string | null;
  workFormat: WorkFormat | null;
  city: string | null;
  geoPreferences: Record<string, unknown> | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
  skills: ResumeSkill[];
  languages: ResumeLanguage[];
  certifications: ResumeCertification[];
  portfolioLinks: ResumePortfolioLink[];
  completion?: {
    percent: number;
    sections: Array<{ key: string; title: string; complete: boolean }>;
    missing: string[];
    canPublish: boolean;
  };
}

export type StructuredResumeInput = Partial<
  Pick<
    StructuredResume,
    | "desiredPosition"
    | "specialization"
    | "summary"
    | "experienceYears"
    | "desiredSalary"
    | "employmentType"
    | "workSchedule"
    | "workFormat"
    | "city"
    | "geoPreferences"
    | "isPublic"
  >
> & {
  skills?: Omit<ResumeSkill, "id">[];
};

export type CandidateProfileSectionsInput = Partial<{
  experiences: Omit<CandidateExperience, "id">[];
  educations: Omit<CandidateEducation, "id">[];
  certifications: Omit<CandidateCertification, "id">[];
  languages: Omit<CandidateProfileLanguage, "id">[];
  portfolioLinks: Omit<CandidateProfilePortfolioLink, "id">[];
}>;

export type CandidateProfileUpdateInput = Partial<
  Omit<
    CandidateProfile,
    | "id"
    | "userId"
    | "createdAt"
    | "updatedAt"
    | "experiences"
    | "educations"
    | "certifications"
    | "languages"
    | "portfolioLinks"
  >
> &
  CandidateProfileSectionsInput;
