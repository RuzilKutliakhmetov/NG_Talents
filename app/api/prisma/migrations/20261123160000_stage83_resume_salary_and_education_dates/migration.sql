UPDATE "resumes"
SET "salaryCurrency" = 'RUB'
WHERE "salaryCurrency" <> 'RUB';

ALTER TABLE "candidate_educations"
  RENAME COLUMN "startYear" TO "startDate";
ALTER TABLE "candidate_educations"
  ALTER COLUMN "startDate" TYPE TIMESTAMP(3)
  USING CASE
    WHEN "startDate" BETWEEN 1 AND 9999
      THEN make_date("startDate", 1, 1)::TIMESTAMP(3)
    ELSE NULL
  END;
ALTER TABLE "candidate_educations"
  RENAME COLUMN "endYear" TO "endDate";
ALTER TABLE "candidate_educations"
  ALTER COLUMN "endDate" TYPE TIMESTAMP(3)
  USING CASE
    WHEN "endDate" BETWEEN 1 AND 9999
      THEN make_date("endDate", 1, 1)::TIMESTAMP(3)
    ELSE NULL
  END;

ALTER TABLE "resume_educations"
  RENAME COLUMN "startYear" TO "startDate";
ALTER TABLE "resume_educations"
  ALTER COLUMN "startDate" TYPE TIMESTAMP(3)
  USING CASE
    WHEN "startDate" BETWEEN 1 AND 9999
      THEN make_date("startDate", 1, 1)::TIMESTAMP(3)
    ELSE NULL
  END;
ALTER TABLE "resume_educations"
  RENAME COLUMN "endYear" TO "endDate";
ALTER TABLE "resume_educations"
  ALTER COLUMN "endDate" TYPE TIMESTAMP(3)
  USING CASE
    WHEN "endDate" BETWEEN 1 AND 9999
      THEN make_date("endDate", 1, 1)::TIMESTAMP(3)
    ELSE NULL
  END;

UPDATE "applications"
SET "resumeSnapshot" = jsonb_set(
  jsonb_set(
    "resumeSnapshot",
    '{desiredSalary}',
    COALESCE(
      "resumeSnapshot"->'desiredSalaryMin',
      "resumeSnapshot"->'desiredSalaryMax',
      'null'::JSONB
    ),
    true
  ),
  '{salaryCurrency}',
  '"RUB"'::JSONB,
  true
)
WHERE "resumeSnapshot" IS NOT NULL;
