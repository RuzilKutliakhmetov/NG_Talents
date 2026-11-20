-- Add in-app read state and event idempotency without changing existing notifications.
ALTER TABLE "notifications"
ADD COLUMN "eventKey" TEXT,
ADD COLUMN "readAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "notifications_eventKey_key"
ON "notifications"("eventKey");

CREATE INDEX "notifications_userId_readAt_createdAt_idx"
ON "notifications"("userId", "readAt", "createdAt");

CREATE TABLE "notification_outbox" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_outbox_eventKey_key"
ON "notification_outbox"("eventKey");

CREATE INDEX "notification_outbox_processedAt_availableAt_createdAt_idx"
ON "notification_outbox"("processedAt", "availableAt", "createdAt");

CREATE INDEX "notification_outbox_userId_idx"
ON "notification_outbox"("userId");

ALTER TABLE "notification_outbox"
ADD CONSTRAINT "notification_outbox_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
