ALTER TYPE "NotificationType" ADD VALUE 'NEW_MESSAGE';

CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversations_applicationId_key"
ON "conversations"("applicationId");

CREATE INDEX "conversations_updatedAt_idx"
ON "conversations"("updatedAt");

CREATE UNIQUE INDEX "messages_conversationId_senderId_clientMessageId_key"
ON "messages"("conversationId", "senderId", "clientMessageId");

CREATE INDEX "messages_conversationId_createdAt_id_idx"
ON "messages"("conversationId", "createdAt", "id");

CREATE INDEX "messages_conversationId_readAt_senderId_idx"
ON "messages"("conversationId", "readAt", "senderId");

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "applications"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
ADD CONSTRAINT "messages_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "conversations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
ADD CONSTRAINT "messages_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "conversations" ("id", "applicationId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "createdAt", "updatedAt"
FROM "applications";
