CREATE TYPE "WorkFormat" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');
CREATE TYPE "VacancyRegion" AS ENUM ('BASHKORTOSTAN', 'KHMAO', 'YANAO', 'TATARSTAN', 'OTHER');

ALTER TABLE "vacancies" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE "vacancies" ADD COLUMN "salaryGross" BOOLEAN;
ALTER TABLE "vacancies" ADD COLUMN "workFormat" "WorkFormat" NOT NULL DEFAULT 'ONSITE';
ALTER TABLE "vacancies" ADD COLUMN "locationAddress" TEXT;
ALTER TABLE "vacancies" ADD COLUMN "travelProvided" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "vacancies" ADD COLUMN "locationRegion_new" "VacancyRegion";
UPDATE "vacancies"
SET "locationRegion_new" = CASE UPPER("locationRegion")
  WHEN 'BASHKORTOSTAN' THEN 'BASHKORTOSTAN'::"VacancyRegion"
  WHEN 'KHMAO' THEN 'KHMAO'::"VacancyRegion"
  WHEN 'YANAO' THEN 'YANAO'::"VacancyRegion"
  WHEN 'TATARSTAN' THEN 'TATARSTAN'::"VacancyRegion"
  ELSE 'OTHER'::"VacancyRegion"
END;
ALTER TABLE "vacancies" ALTER COLUMN "locationRegion_new" SET NOT NULL;
ALTER TABLE "vacancies" DROP COLUMN "locationRegion";
ALTER TABLE "vacancies" RENAME COLUMN "locationRegion_new" TO "locationRegion";
CREATE INDEX "vacancies_locationRegion_idx" ON "vacancies"("locationRegion");

ALTER TABLE "vacancy_requirements" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "vacancy_certifications" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "type" "CandidateCertificationType" NOT NULL,
    "name" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vacancy_certifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vacancy_certifications_vacancyId_idx" ON "vacancy_certifications"("vacancyId");
CREATE INDEX "vacancy_certifications_type_idx" ON "vacancy_certifications"("type");
ALTER TABLE "vacancy_certifications" ADD CONSTRAINT "vacancy_certifications_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
