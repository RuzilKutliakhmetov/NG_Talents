import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VacancyApplicationAction } from "@/features/applications/components/vacancy-application-action";
import type { PublicVacancy } from "@/features/vacancies/types";
import {
  formatPublishedDate,
  formatSalary,
  getCertificationLabel,
  getEmploymentLabel,
  getRegionLabel,
  getRequirementLabel,
  getWorkFormatLabel,
} from "@/features/vacancies/lib";

interface VacancyDetailsProps {
  vacancy: PublicVacancy;
  backHref: string;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t py-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export function VacancyDetails({ vacancy, backHref }: VacancyDetailsProps) {
  const employerName =
    vacancy.employer?.shortName?.trim() || vacancy.employer?.legalName?.trim();
  const location = [vacancy.locationCity, getRegionLabel(vacancy.locationRegion)]
    .filter(Boolean)
    .join(", ");
  const publishedAt = formatPublishedDate(vacancy.publishedAt);
  const benefits = [
    vacancy.housingProvided ? "Предоставляется жильё" : undefined,
    vacancy.flightProvided ? "Оплачивается перелёт" : undefined,
    vacancy.travelProvided ? "Оплачивается проезд" : undefined,
    vacancy.medicalInsurance ? "Медицинская страховка" : undefined,
  ].filter((benefit): benefit is string => Boolean(benefit));

  const requirements = (vacancy.requirements ?? []).filter(
    (requirement) =>
      requirement.name?.trim() || requirement.description?.trim(),
  );
  const certifications = (vacancy.certifications ?? []).filter(
    (certification) =>
      certification.name?.trim() || getCertificationLabel(certification.type),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={backHref}
        className={buttonVariants({ variant: "ghost", className: "-ml-3 mb-5" })}
      >
        <ArrowLeft aria-hidden="true" />
        Назад к вакансиям
      </Link>

      <Card className="overflow-hidden p-5 sm:p-8">
        <header>
          <div className="flex flex-wrap gap-2">
            {getEmploymentLabel(vacancy.employmentType) ? (
              <Badge variant="secondary">
                {getEmploymentLabel(vacancy.employmentType)}
              </Badge>
            ) : null}
            {getWorkFormatLabel(vacancy.workFormat) ? (
              <Badge variant="outline">
                {getWorkFormatLabel(vacancy.workFormat)}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {vacancy.title}
          </h1>
          {employerName ? (
            <p className="mt-2 text-base text-muted-foreground">{employerName}</p>
          ) : null}

          <p className="mt-6 text-2xl font-semibold">
            {formatSalary(vacancy.salaryMin, vacancy.salaryMax, vacancy.currency)}
          </p>
          {typeof vacancy.salaryGross === "boolean" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {vacancy.salaryGross ? "До вычета налогов" : "На руки"}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {location ? (
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4" />
                {location}
              </span>
            ) : null}
            {vacancy.locationAddress?.trim() ? (
              <span>{vacancy.locationAddress}</span>
            ) : null}
            {vacancy.schedule?.trim() ? <span>{vacancy.schedule}</span> : null}
            {publishedAt ? (
              <span className="inline-flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="size-4" />
                Опубликована {publishedAt}
              </span>
            ) : null}
          </div>
        </header>

        <div className="mt-8">
          {vacancy.description?.trim() ? (
            <DetailSection title="Описание">
              <p className="whitespace-pre-line text-foreground/85">
                {vacancy.description}
              </p>
            </DetailSection>
          ) : null}

          {vacancy.responsibilities?.trim() ? (
            <DetailSection title="Обязанности">
              <p className="whitespace-pre-line text-foreground/85">
                {vacancy.responsibilities}
              </p>
            </DetailSection>
          ) : null}

          {vacancy.requirementsText?.trim() || requirements.length ? (
            <DetailSection title="Требования">
              {vacancy.requirementsText?.trim() ? (
                <p className="mb-4 whitespace-pre-line text-foreground/85">
                  {vacancy.requirementsText}
                </p>
              ) : null}
              {requirements.length ? (
                <ul className="space-y-3">
                  {requirements.map((requirement) => (
                    <li key={requirement.id} className="border-l-2 pl-4">
                      <p className="font-medium text-foreground">
                        {requirement.name}
                        {requirement.required ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            обязательно
                          </span>
                        ) : null}
                      </p>
                      {requirement.type &&
                      getRequirementLabel(requirement.type) ? (
                        <p className="text-xs">
                          {getRequirementLabel(requirement.type)}
                        </p>
                      ) : null}
                      {requirement.description?.trim() ? (
                        <p>{requirement.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </DetailSection>
          ) : null}

          {certifications.length ? (
            <DetailSection title="Сертификаты">
              <ul className="space-y-2">
                {certifications.map((certification) => (
                  <li
                    key={certification.id}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="text-foreground">
                      {certification.name?.trim() ||
                        getCertificationLabel(certification.type)}
                    </span>
                    <Badge variant="outline">
                      {certification.required ? "Обязательный" : "Необязательный"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}

          {vacancy.conditions?.trim() ? (
            <DetailSection title="Условия">
              <p className="whitespace-pre-line text-foreground/85">
                {vacancy.conditions}
              </p>
            </DetailSection>
          ) : null}

          {benefits.length ? (
            <DetailSection title="Преимущества">
              <ul className="grid gap-2 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="text-foreground/85">
                    {benefit}
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}
        </div>
      </Card>
      <VacancyApplicationAction vacancyId={vacancy.id} />
    </main>
  );
}
