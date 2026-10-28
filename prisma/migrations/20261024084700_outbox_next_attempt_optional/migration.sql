-- AlterTable
ALTER TABLE "outbox_events" ALTER COLUMN "nextAttemptAt" DROP DEFAULT,
ALTER COLUMN "nextAttemptAt" DROP NOT NULL;
