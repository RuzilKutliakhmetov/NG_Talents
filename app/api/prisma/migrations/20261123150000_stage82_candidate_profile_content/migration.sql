ALTER TYPE "CandidateCertificationType" ADD VALUE IF NOT EXISTS 'COURSE';

INSERT INTO "resumes" (
  "id",
  "userId",
  "candidateProfileId",
  "title",
  "status",
  "desiredSalaryMin",
  "desiredSalaryMax",
  "salaryCurrency",
  "createdAt",
  "updatedAt"
)
SELECT
  substr(md5(profile."id" || '-profile-salary-resume'), 1, 8) || '-' ||
  substr(md5(profile."id" || '-profile-salary-resume'), 9, 4) || '-' ||
  substr(md5(profile."id" || '-profile-salary-resume'), 13, 4) || '-' ||
  substr(md5(profile."id" || '-profile-salary-resume'), 17, 4) || '-' ||
  substr(md5(profile."id" || '-profile-salary-resume'), 21, 12),
  profile."userId",
  profile."id",
  'Резюме',
  'DRAFT',
  profile."desiredSalaryMin",
  profile."desiredSalaryMax",
  profile."salaryCurrency",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "candidate_profiles" AS profile
WHERE (profile."desiredSalaryMin" IS NOT NULL OR profile."desiredSalaryMax" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1
    FROM "resumes"
    WHERE "candidateProfileId" = profile."id"
  );

WITH selected_resume AS (
  SELECT DISTINCT ON ("candidateProfileId")
    "id",
    "candidateProfileId"
  FROM "resumes"
  ORDER BY "candidateProfileId", "isPrimary" DESC, "createdAt" ASC, "id"
)
UPDATE "resumes" AS resume
SET
  "desiredSalaryMin" = COALESCE(resume."desiredSalaryMin", profile."desiredSalaryMin"),
  "desiredSalaryMax" = COALESCE(resume."desiredSalaryMax", profile."desiredSalaryMax"),
  "salaryCurrency" = CASE
    WHEN resume."salaryCurrency" = 'RUB'
      AND resume."desiredSalaryMin" IS NULL
      AND resume."desiredSalaryMax" IS NULL
      AND (profile."desiredSalaryMin" IS NOT NULL OR profile."desiredSalaryMax" IS NOT NULL)
    THEN profile."salaryCurrency"
    ELSE resume."salaryCurrency"
  END
FROM "candidate_profiles" AS profile
JOIN selected_resume ON selected_resume."candidateProfileId" = profile."id"
WHERE resume."id" = selected_resume."id";

ALTER TABLE "candidate_profiles"
  DROP COLUMN "desiredSalaryMin",
  DROP COLUMN "desiredSalaryMax",
  DROP COLUMN "salaryCurrency";

CREATE TABLE "candidate_profile_languages" (
  "id" TEXT NOT NULL,
  "candidateProfileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "level" "LanguageLevel" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "candidate_profile_languages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidate_profile_portfolio_links" (
  "id" TEXT NOT NULL,
  "candidateProfileId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT NOT NULL,
  "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "candidate_profile_portfolio_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidate_profile_languages_candidateProfileId_name_key"
  ON "candidate_profile_languages"("candidateProfileId", "name");
CREATE INDEX "candidate_profile_languages_candidateProfileId_sortOrder_idx"
  ON "candidate_profile_languages"("candidateProfileId", "sortOrder");
CREATE INDEX "candidate_profile_portfolio_links_candidateProfileId_sortOrder_idx"
  ON "candidate_profile_portfolio_links"("candidateProfileId", "sortOrder");

ALTER TABLE "candidate_profile_languages"
  ADD CONSTRAINT "candidate_profile_languages_candidateProfileId_fkey"
  FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_profile_portfolio_links"
  ADD CONSTRAINT "candidate_profile_portfolio_links_candidateProfileId_fkey"
  FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

WITH selected_resume AS (
  SELECT DISTINCT ON ("candidateProfileId")
    "id",
    "candidateProfileId"
  FROM "resumes"
  ORDER BY "candidateProfileId", "isPrimary" DESC, "createdAt" ASC, "id"
),
ranked_languages AS (
  SELECT
    selected_resume."candidateProfileId",
    language."id" AS "sourceId",
    trim(language."name") AS "name",
    language."level",
    language."sortOrder",
    row_number() OVER (
      PARTITION BY selected_resume."candidateProfileId", lower(trim(language."name"))
      ORDER BY language."sortOrder", language."id"
    ) AS "rowNumber"
  FROM selected_resume
  JOIN "resume_languages" AS language ON language."resumeId" = selected_resume."id"
  WHERE trim(language."name") <> ''
)
INSERT INTO "candidate_profile_languages" (
  "id", "candidateProfileId", "name", "level", "sortOrder"
)
SELECT
  substr(md5('candidate-profile-language:' || "sourceId"), 1, 8) || '-' ||
  substr(md5('candidate-profile-language:' || "sourceId"), 9, 4) || '-' ||
  substr(md5('candidate-profile-language:' || "sourceId"), 13, 4) || '-' ||
  substr(md5('candidate-profile-language:' || "sourceId"), 17, 4) || '-' ||
  substr(md5('candidate-profile-language:' || "sourceId"), 21, 12),
  "candidateProfileId",
  "name",
  "level",
  "sortOrder"
FROM ranked_languages
WHERE "rowNumber" = 1;

WITH selected_resume AS (
  SELECT DISTINCT ON ("candidateProfileId")
    "id",
    "candidateProfileId"
  FROM "resumes"
  ORDER BY "candidateProfileId", "isPrimary" DESC, "createdAt" ASC, "id"
)
INSERT INTO "candidate_profile_portfolio_links" (
  "id", "candidateProfileId", "title", "description", "url", "technologies", "sortOrder"
)
SELECT
  substr(md5('candidate-profile-portfolio:' || portfolio."id"), 1, 8) || '-' ||
  substr(md5('candidate-profile-portfolio:' || portfolio."id"), 9, 4) || '-' ||
  substr(md5('candidate-profile-portfolio:' || portfolio."id"), 13, 4) || '-' ||
  substr(md5('candidate-profile-portfolio:' || portfolio."id"), 17, 4) || '-' ||
  substr(md5('candidate-profile-portfolio:' || portfolio."id"), 21, 12),
  selected_resume."candidateProfileId",
  portfolio."title",
  portfolio."description",
  portfolio."url",
  portfolio."technologies",
  portfolio."sortOrder"
FROM selected_resume
JOIN "resume_portfolio_links" AS portfolio ON portfolio."resumeId" = selected_resume."id";
