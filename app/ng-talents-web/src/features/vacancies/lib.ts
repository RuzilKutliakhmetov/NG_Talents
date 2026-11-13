import type {
  CertificationType,
  EmploymentType,
  RequirementType,
  VacancyRegion,
  WorkFormat,
} from "@/types/api";

import {
  CERTIFICATION_TYPES,
  EMPLOYMENT_TYPES,
  VACANCY_REGIONS,
  WORK_FORMATS,
  type VacancyListParams,
  type VacancySearchParams,
  type VacancySort,
} from "./types";

const employmentLabels: Record<EmploymentType, string> = {
  SHIFT: "Вахта",
  PERMANENT: "Постоянная работа",
  PROJECT: "Проектная работа",
  PART_TIME: "Частичная занятость",
  TEMPORARY: "Временная работа",
};

const regionLabels: Record<VacancyRegion, string> = {
  BASHKORTOSTAN: "Башкортостан",
  KHMAO: "ХМАО",
  YANAO: "ЯНАО",
  TATARSTAN: "Татарстан",
  OTHER: "Другой регион",
};

const workFormatLabels: Record<WorkFormat, string> = {
  ONSITE: "На месте",
  HYBRID: "Гибридный",
  REMOTE: "Удалённый",
};

const certificationLabels: Record<CertificationType, string> = {
  A1: "Сертификат A1",
  B1_1: "Сертификат B1.1",
  ELECTRICAL_SAFETY: "Электробезопасность",
  NAKS: "Сертификат НАКС",
  OTHER: "Другой сертификат",
};

const requirementLabels: Record<RequirementType, string> = {
  EXPERIENCE: "Опыт работы",
  EDUCATION: "Образование",
  CERTIFICATE: "Сертификат",
  LICENSE: "Лицензия",
  SAFETY: "Охрана труда",
  SKILL: "Навык",
  OTHER: "Требование",
};

const sortValues: VacancySort[] = ["createdAt", "salaryMin", "salaryMax"];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function enumValue<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return value && allowed.includes(value as T) ? (value as T) : undefined;
}

function integerValue(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parseVacancySearchParams(
  searchParams: VacancySearchParams,
): VacancyListParams {
  const salaryMin = integerValue(firstValue(searchParams.salaryMin));
  const salaryMax = integerValue(firstValue(searchParams.salaryMax));
  const salaryRangeIsValid =
    (salaryMin === undefined || salaryMax === undefined || salaryMin <= salaryMax) &&
    (firstValue(searchParams.salaryMin) === undefined || salaryMin !== undefined) &&
    (firstValue(searchParams.salaryMax) === undefined || salaryMax !== undefined);

  const page = integerValue(firstValue(searchParams.page));
  const limit = integerValue(firstValue(searchParams.limit));
  const sort = enumValue(firstValue(searchParams.sort), sortValues);

  return {
    title: firstValue(searchParams.title)?.trim() || undefined,
    employmentType: enumValue(
      firstValue(searchParams.employmentType),
      EMPLOYMENT_TYPES,
    ),
    locationRegion: enumValue(
      firstValue(searchParams.locationRegion),
      VACANCY_REGIONS,
    ),
    locationCity: firstValue(searchParams.locationCity)?.trim() || undefined,
    workFormat: enumValue(firstValue(searchParams.workFormat), WORK_FORMATS),
    ...(salaryRangeIsValid ? { salaryMin, salaryMax } : {}),
    certification: enumValue(
      firstValue(searchParams.certification),
      CERTIFICATION_TYPES,
    ),
    page: page && page > 0 ? page : 1,
    limit: limit && limit >= 1 && limit <= 50 ? limit : 20,
    sort: sort ?? "createdAt",
    direction: firstValue(searchParams.direction) === "asc" ? "asc" : "desc",
  };
}

export function hasInvalidSalaryRange(
  searchParams: VacancySearchParams,
): boolean {
  const rawMin = firstValue(searchParams.salaryMin);
  const rawMax = firstValue(searchParams.salaryMax);
  const min = integerValue(rawMin);
  const max = integerValue(rawMax);

  return (
    (rawMin !== undefined && min === undefined) ||
    (rawMax !== undefined && max === undefined) ||
    (min !== undefined && max !== undefined && min > max)
  );
}

export function serializeVacancySearchParams(
  params: VacancyListParams,
): string {
  const search = new URLSearchParams();
  if (params.title) search.set("title", params.title);
  if (params.employmentType) search.set("employmentType", params.employmentType);
  if (params.locationRegion) search.set("locationRegion", params.locationRegion);
  if (params.locationCity) search.set("locationCity", params.locationCity);
  if (params.workFormat) search.set("workFormat", params.workFormat);
  if (params.salaryMin !== undefined)
    search.set("salaryMin", String(params.salaryMin));
  if (params.salaryMax !== undefined)
    search.set("salaryMax", String(params.salaryMax));
  if (params.certification) search.set("certification", params.certification);
  if (params.page > 1) search.set("page", String(params.page));
  if (params.limit !== 20) search.set("limit", String(params.limit));
  if (params.sort !== "createdAt") search.set("sort", params.sort);
  if (params.direction !== "desc") search.set("direction", params.direction);
  return search.toString();
}

export function getEmploymentLabel(value: string | null | undefined) {
  return value && value in employmentLabels
    ? employmentLabels[value as EmploymentType]
    : undefined;
}

export function getRegionLabel(value: string | null | undefined) {
  return value && value in regionLabels
    ? regionLabels[value as VacancyRegion]
    : undefined;
}

export function getWorkFormatLabel(value: string | null | undefined) {
  return value && value in workFormatLabels
    ? workFormatLabels[value as WorkFormat]
    : undefined;
}

export function getCertificationLabel(value: string | null | undefined) {
  return value && value in certificationLabels
    ? certificationLabels[value as CertificationType]
    : undefined;
}

export function getRequirementLabel(value: string | null | undefined) {
  return value && value in requirementLabels
    ? requirementLabels[value as RequirementType]
    : undefined;
}

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (min == null && max == null) return "Зарплата не указана";

  const formatter = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  });
  const formatAmount = (amount: number) => {
    if (currency && /^[A-Za-z]{3}$/.test(currency)) {
      try {
        return new Intl.NumberFormat("ru-RU", {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
      }
    }
    return currency ? `${formatter.format(amount)} ${currency}` : formatter.format(amount);
  };

  if (min != null && max != null)
    return `${formatAmount(min)} – ${formatAmount(max)}`;
  return formatAmount(min ?? max ?? 0);
}

export function formatPublishedDate(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getSearchParamsSignature(searchParams: VacancySearchParams) {
  return Object.keys(searchParams)
    .sort()
    .map((key) => {
      const value = searchParams[key];
      return `${encodeURIComponent(key)}=${encodeURIComponent(
        Array.isArray(value) ? value.join(",") : value ?? "",
      )}`;
    })
    .join("&");
}
