import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PublicVacancy, VacancyListParams } from "@/features/vacancies/types";
import { serializeVacancySearchParams } from "@/features/vacancies/lib";
import {
  formatPublishedDate,
  formatSalary,
  getCertificationLabel,
  getEmploymentLabel,
  getRegionLabel,
  getWorkFormatLabel,
} from "@/features/vacancies/lib";

interface VacancyCardProps {
  vacancy: PublicVacancy;
  searchContext: VacancyListParams;
}

export function VacancyCard({ vacancy, searchContext }: VacancyCardProps) {
  const search = serializeVacancySearchParams(searchContext);
  const href = `/vacancies/${encodeURIComponent(vacancy.id)}${search ? `?${search}` : ""}`;
  const location = [vacancy.locationCity, getRegionLabel(vacancy.locationRegion)]
    .filter(Boolean)
    .join(", ");
  const date = formatPublishedDate(vacancy.publishedAt);
  const requirements = [
    ...(vacancy.requirements ?? [])
      .map((requirement) => requirement.name?.trim())
      .filter((name): name is string => Boolean(name)),
    ...(vacancy.certifications ?? [])
      .map(
        (certification) =>
          certification.name?.trim() ||
          getCertificationLabel(certification.type),
      )
      .filter((name): name is string => Boolean(name)),
  ].slice(0, 3);
  const employerName =
    vacancy.employer?.shortName?.trim() || vacancy.employer?.legalName?.trim();

  return (
    <Link
      href={href}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Открыть вакансию: ${vacancy.title}`}
    >
      <Card className="h-full border-border/80 p-5 transition-shadow group-hover:shadow-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {vacancy.employmentType && getEmploymentLabel(vacancy.employmentType) ? (
                <Badge variant="secondary">
                  {getEmploymentLabel(vacancy.employmentType)}
                </Badge>
              ) : null}
              {vacancy.workFormat && getWorkFormatLabel(vacancy.workFormat) ? (
                <Badge variant="outline">
                  {getWorkFormatLabel(vacancy.workFormat)}
                </Badge>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight group-hover:text-primary sm:text-2xl">
              {vacancy.title}
            </h2>
            {employerName ? (
              <p className="mt-1 text-sm text-muted-foreground">{employerName}</p>
            ) : null}
          </div>
          <ArrowUpRight
            aria-hidden="true"
            className="hidden size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block"
          />
        </div>

        <p className="mt-5 text-lg font-semibold">
          {formatSalary(vacancy.salaryMin, vacancy.salaryMax, vacancy.currency)}
          {vacancy.salaryGross === true ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              до вычета налогов
            </span>
          ) : vacancy.salaryGross === false ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              на руки
            </span>
          ) : null}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4" />
              {location}
            </span>
          ) : null}
          {vacancy.schedule?.trim() ? (
            <span>{vacancy.schedule}</span>
          ) : null}
        </div>

        {requirements.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {requirements.map((requirement, index) => (
              <Badge key={`${requirement}-${index}`} variant="outline">
                {requirement}
              </Badge>
            ))}
          </div>
        ) : null}

        {date ? (
          <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
            Опубликована {date}
          </p>
        ) : null}
      </Card>
    </Link>
  );
}
