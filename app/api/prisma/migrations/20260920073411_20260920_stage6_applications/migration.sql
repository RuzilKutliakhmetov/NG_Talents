/*
  Warnings:

  - You are about to drop the column `changedById` on the `application_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `newStatus` on the `application_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `oldStatus` on the `application_status_history` table. All the data in the column will be lost.
  - You are about to drop the column `recruiterComment` on the `applications` table. All the data in the column will be lost.
  - Added the required column `actorId` to the `application_status_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorRole` to the `application_status_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toStatus` to the `application_status_history` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_vacancyId_fkey";

-- DropIndex
DROP INDEX "application_status_history_applicationId_idx";

-- DropIndex
DROP INDEX "application_status_history_createdAt_idx";

-- DropIndex
DROP INDEX "applications_candidateId_idx";

-- DropIndex
DROP INDEX "applications_createdAt_idx";

-- DropIndex
DROP INDEX "applications_status_idx";

-- DropIndex
DROP INDEX "applications_vacancyId_idx";

-- AlterTable
ALTER TABLE "application_status_history" DROP COLUMN "changedById",
DROP COLUMN "newStatus",
DROP COLUMN "oldStatus",
ADD COLUMN     "actorId" TEXT NOT NULL,
ADD COLUMN     "actorRole" "UserRole" NOT NULL,
ADD COLUMN     "fromStatus" "ApplicationStatus",
ADD COLUMN     "toStatus" "ApplicationStatus" NOT NULL;

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "recruiterComment",
ADD COLUMN     "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "candidateComment" TEXT,
ADD COLUMN     "employerComment" TEXT,
ADD COLUMN     "viewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "application_status_history_applicationId_createdAt_idx" ON "application_status_history"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "application_status_history_actorId_createdAt_idx" ON "application_status_history"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "application_status_history_toStatus_createdAt_idx" ON "application_status_history"("toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "applications_candidateId_createdAt_idx" ON "applications"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "applications_vacancyId_status_idx" ON "applications"("vacancyId", "status");

-- CreateIndex
CREATE INDEX "applications_status_appliedAt_idx" ON "applications"("status", "appliedAt");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
