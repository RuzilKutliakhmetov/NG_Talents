CREATE TYPE "EmployerMemberRole" AS ENUM ('OWNER', 'ADMIN', 'HR', 'RECRUITER');
CREATE TYPE "CandidateCertificationType" AS ENUM ('A1', 'B1_1', 'ELECTRICAL_SAFETY', 'NAKS', 'OTHER');
CREATE TYPE "EmployerVerificationStatus" AS ENUM ('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'REQUIRES_ATTENTION', 'REJECTED');
CREATE TYPE "EmployerVerificationMethod" AS ENUM ('MANUAL', 'DADATA', 'MIXED');

ALTER TABLE "candidate_profiles" ADD COLUMN "readyForShiftWork" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employers" ADD COLUMN "email" TEXT;
ALTER TABLE "employers" ADD COLUMN "phone" TEXT;
ALTER TABLE "employers" ADD COLUMN "address" TEXT;
ALTER TABLE "employer_members" ADD COLUMN "memberRole" "EmployerMemberRole" NOT NULL DEFAULT 'HR';
ALTER TABLE "employer_verifications" ADD COLUMN "verificationStatus" "EmployerVerificationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "employer_verifications" ADD COLUMN "verificationMethod" "EmployerVerificationMethod" NOT NULL DEFAULT 'MANUAL';

CREATE TABLE "candidate_experiences" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidate_educations" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "degree" TEXT,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "candidate_certifications" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "type" "CandidateCertificationType" NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "issuer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "candidate_certifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "candidate_experiences_candidateProfileId_idx" ON "candidate_experiences"("candidateProfileId");
CREATE INDEX "candidate_educations_candidateProfileId_idx" ON "candidate_educations"("candidateProfileId");
CREATE INDEX "candidate_certifications_candidateProfileId_idx" ON "candidate_certifications"("candidateProfileId");
CREATE INDEX "candidate_certifications_type_idx" ON "candidate_certifications"("type");
CREATE INDEX "candidate_certifications_expiresAt_idx" ON "candidate_certifications"("expiresAt");

ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_educations" ADD CONSTRAINT "candidate_educations_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_certifications" ADD CONSTRAINT "candidate_certifications_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employer_verifications" ADD CONSTRAINT "employer_verifications_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
