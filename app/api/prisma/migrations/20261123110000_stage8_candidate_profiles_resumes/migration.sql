CREATE TYPE "ResumeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "LanguageLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE');

ALTER TABLE "candidate_profiles"
  ADD COLUMN "specialization" TEXT,
  ADD COLUMN "salaryCurrency" TEXT NOT NULL DEFAULT 'RUB',
  ADD COLUMN "employmentType" "EmploymentType",
  ADD COLUMN "workFormat" "WorkFormat",
  ADD COLUMN "preferredSchedule" TEXT,
  ADD COLUMN "readyToRelocate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "readyForTrips" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showContacts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "hideFromEmployers" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "candidate_experiences"
  ADD COLUMN "achievements" TEXT,
  ADD COLUMN "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "candidate_educations"
  ADD COLUMN "faculty" TEXT,
  ADD COLUMN "isIncomplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "candidate_experiences_candidateProfileId_sortOrder_idx"
  ON "candidate_experiences"("candidateProfileId", "sortOrder");
CREATE INDEX "candidate_educations_candidateProfileId_sortOrder_idx"
  ON "candidate_educations"("candidateProfileId", "sortOrder");

ALTER TABLE "applications" ADD COLUMN "resumeSnapshot" JSONB;

ALTER TABLE "resumes"
  ALTER COLUMN "storageKey" DROP NOT NULL,
  ALTER COLUMN "originalName" DROP NOT NULL,
  ALTER COLUMN "mimeType" DROP NOT NULL,
  ALTER COLUMN "sizeBytes" DROP NOT NULL,
  ADD COLUMN "status" "ResumeStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "desiredPosition" TEXT,
  ADD COLUMN "specialization" TEXT,
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "experienceYears" INTEGER,
  ADD COLUMN "desiredSalaryMin" INTEGER,
  ADD COLUMN "desiredSalaryMax" INTEGER,
  ADD COLUMN "salaryCurrency" TEXT NOT NULL DEFAULT 'RUB',
  ADD COLUMN "employmentType" "EmploymentType",
  ADD COLUMN "workSchedule" TEXT,
  ADD COLUMN "workFormat" "WorkFormat",
  ADD COLUMN "city" TEXT,
  ADD COLUMN "geoPreferences" JSONB,
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "resumes_status_idx" ON "resumes"("status");
CREATE INDEX "resumes_isPublic_idx" ON "resumes"("isPublic");

UPDATE "resumes"
SET "status" = 'PUBLISHED'
WHERE "storageKey" IS NOT NULL;

CREATE TABLE "resume_experiences" (
  "id" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "achievements" TEXT,
  "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resume_experiences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_educations" (
  "id" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "faculty" TEXT,
  "specialization" TEXT NOT NULL,
  "degree" TEXT,
  "startYear" INTEGER,
  "endYear" INTEGER,
  "isIncomplete" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resume_educations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_skills" (
  "id" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "level" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "resume_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_languages" (
  "id" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "level" "LanguageLevel" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "resume_languages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_certifications" (
  "id" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "issuer" TEXT,
  "issuedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "url" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "resume_certifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resume_portfolio_links" (
  "id" TEXT NOT NULL,
  "resumeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT NOT NULL,
  "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "resume_portfolio_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resume_skills_resumeId_name_key" ON "resume_skills"("resumeId", "name");
CREATE UNIQUE INDEX "resume_languages_resumeId_name_key" ON "resume_languages"("resumeId", "name");
CREATE INDEX "resume_experiences_resumeId_sortOrder_idx" ON "resume_experiences"("resumeId", "sortOrder");
CREATE INDEX "resume_educations_resumeId_sortOrder_idx" ON "resume_educations"("resumeId", "sortOrder");
CREATE INDEX "resume_skills_resumeId_sortOrder_idx" ON "resume_skills"("resumeId", "sortOrder");
CREATE INDEX "resume_languages_resumeId_sortOrder_idx" ON "resume_languages"("resumeId", "sortOrder");
CREATE INDEX "resume_certifications_resumeId_sortOrder_idx" ON "resume_certifications"("resumeId", "sortOrder");
CREATE INDEX "resume_portfolio_links_resumeId_sortOrder_idx" ON "resume_portfolio_links"("resumeId", "sortOrder");

ALTER TABLE "resume_experiences" ADD CONSTRAINT "resume_experiences_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_educations" ADD CONSTRAINT "resume_educations_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_languages" ADD CONSTRAINT "resume_languages_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_certifications" ADD CONSTRAINT "resume_certifications_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resume_portfolio_links" ADD CONSTRAINT "resume_portfolio_links_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "applications" AS a
SET "resumeSnapshot" = jsonb_build_object(
  'resumeId', r."id",
  'title', r."title",
  'desiredPosition', r."desiredPosition",
  'specialization', r."specialization",
  'summary', r."summary",
  'experienceYears', r."experienceYears",
  'desiredSalaryMin', r."desiredSalaryMin",
  'desiredSalaryMax', r."desiredSalaryMax",
  'salaryCurrency', r."salaryCurrency",
  'employmentType', r."employmentType",
  'workSchedule', r."workSchedule",
  'workFormat', r."workFormat",
  'city', r."city",
  'geoPreferences', r."geoPreferences",
  'experiences', '[]'::jsonb,
  'educations', '[]'::jsonb,
  'skills', '[]'::jsonb,
  'languages', '[]'::jsonb,
  'certifications', '[]'::jsonb,
  'portfolioLinks', '[]'::jsonb
)
FROM "resumes" r
WHERE a."resumeId" = r."id"
  AND a."resumeSnapshot" IS NULL;
