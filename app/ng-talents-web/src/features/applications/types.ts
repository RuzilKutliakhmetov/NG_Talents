import type {
  Application,
  ApplicationStatus,
  CandidateResumeSummary,
  Pagination,
  Vacancy,
} from "@/types/api";

export type { ApplicationStatus } from "@/types/api";

export interface CreateApplicationInput {
  vacancyId: string;
  resumeId?: string;
  coverLetter?: string;
  candidateComment?: string;
}

export interface CandidateApplication extends Application {
  vacancy: Pick<Vacancy, "id" | "title" | "status" | "employer">;
  resume: CandidateResumeSummary | null;
}

export interface CandidateApplicationDetail extends Application {
  vacancy: Omit<Vacancy, "employer">;
  resume: CandidateResumeSummary | null;
  resumeSnapshot: Record<string, unknown> | null;
}

export interface EmployerApplication extends Application {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    role: "CANDIDATE";
  };
  vacancy: {
    id: string;
    title: string;
    employerId: string;
  };
}

export interface EmployerApplicationDetail extends EmployerApplication {
  vacancy: Vacancy;
  resume: CandidateResumeSummary | null;
  resumeSnapshot: Record<string, unknown> | null;
}

export interface ApplicationListResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface CandidateApplicationQuery {
  status?: ApplicationStatus;
  vacancyId?: string;
  page: number;
  limit: number;
  sort: "createdAt" | "appliedAt" | "updatedAt";
  direction: "asc" | "desc";
}

export interface EmployerApplicationQuery {
  vacancyId?: string;
  status?: ApplicationStatus;
  page: number;
  limit: number;
  sort: "createdAt" | "appliedAt" | "updatedAt" | "status";
  direction: "asc" | "desc";
}

export interface ApplicationStatusInput {
  status: ApplicationStatus;
  comment?: string;
}

export interface ApplicationHistoryEntry {
  id: string;
  applicationId: string;
  actorId: string | null;
  actorRole: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  comment: string | null;
  createdAt: string;
  actor?: {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
  } | null;
}

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "NEW",
  "VIEWED",
  "IN_REVIEW",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: "Новый",
  VIEWED: "Просмотрен",
  IN_REVIEW: "На рассмотрении",
  INTERVIEW: "Собеседование",
  OFFER: "Предложение о работе",
  HIRED: "Принят",
  REJECTED: "Отклонён",
  WITHDRAWN: "Отозван",
};

export const EMPLOYER_STATUS_TRANSITIONS: Record<
  ApplicationStatus,
  ApplicationStatus[]
> = {
  NEW: ["VIEWED", "IN_REVIEW"],
  VIEWED: ["NEW", "IN_REVIEW"],
  IN_REVIEW: ["VIEWED", "INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFER", "REJECTED"],
  OFFER: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};
