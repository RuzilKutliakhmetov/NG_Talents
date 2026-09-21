CREATE UNIQUE INDEX "resumes_one_primary_per_profile_idx"
ON "resumes"("candidateProfileId")
WHERE "isPrimary" = true;