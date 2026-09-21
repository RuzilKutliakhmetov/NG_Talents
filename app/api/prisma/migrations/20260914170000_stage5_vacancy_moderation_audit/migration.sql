CREATE TYPE "VacancyModerationAction" AS ENUM ('START_MODERATION', 'APPROVE', 'REJECT', 'RESUBMIT');

ALTER TABLE "vacancies" ADD COLUMN "closedAt" TIMESTAMP(3);

CREATE TABLE "vacancy_moderation_audits" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "action" "VacancyModerationAction" NOT NULL,
    "fromStatus" "VacancyStatus",
    "toStatus" "VacancyStatus",
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vacancy_moderation_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vacancy_moderation_audits_vacancyId_createdAt_idx" ON "vacancy_moderation_audits"("vacancyId", "createdAt");
CREATE INDEX "vacancy_moderation_audits_actorId_createdAt_idx" ON "vacancy_moderation_audits"("actorId", "createdAt");
CREATE INDEX "vacancy_moderation_audits_action_createdAt_idx" ON "vacancy_moderation_audits"("action", "createdAt");

ALTER TABLE "vacancy_moderation_audits" ADD CONSTRAINT "vacancy_moderation_audits_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vacancy_moderation_audits" ADD CONSTRAINT "vacancy_moderation_audits_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
