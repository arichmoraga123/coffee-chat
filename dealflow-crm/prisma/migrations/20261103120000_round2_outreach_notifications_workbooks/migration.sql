-- Round 2: search indexes, contacts cleanup, imports, follow-ups, notifications, club publishing, guided workbooks.
-- Safe to run more than once. Never deletes data.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "ClubEvent" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "createdById" TEXT,
ADD COLUMN IF NOT EXISTS "declinedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "meetingLink" TEXT,
ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rsvpOn" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ClubPost" ADD COLUMN IF NOT EXISTS "allowDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "audience" JSONB NOT NULL DEFAULT '{"all":true}',
ADD COLUMN IF NOT EXISTS "files" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "lessonIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ClubProject" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "files" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "leadId" TEXT,
ADD COLUMN IF NOT EXISTS "links" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "connectedOn" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "doNotContact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "importBatchId" TEXT,
ADD COLUMN IF NOT EXISTS "list" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS "notPursuing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "priority" TEXT,
ADD COLUMN IF NOT EXISTS "relationshipStage" TEXT,
ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "autoCreated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "importBatchId" TEXT,
ADD COLUMN IF NOT EXISTS "kind" TEXT,
ADD COLUMN IF NOT EXISTS "nextStep" TEXT,
ADD COLUMN IF NOT EXISTS "nextStepDue" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MentorQuestion" ADD COLUMN IF NOT EXISTS "remindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "group" TEXT,
ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS "reason" TEXT,
ADD COLUMN IF NOT EXISTS "ruleKey" TEXT,
ADD COLUMN IF NOT EXISTS "snoozedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "counts" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'complete',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationPref" (
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "email" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "smsConsentAt" TIMESTAMP(3),
    "smsConsentText" TEXT,
    "quietStart" INTEGER NOT NULL DEFAULT 21,
    "quietEnd" INTEGER NOT NULL DEFAULT 8,
    "followupDigest" BOOLEAN NOT NULL DEFAULT true,
    "mentorAlerts" BOOLEAN NOT NULL DEFAULT true,
    "clubPosts" BOOLEAN NOT NULL DEFAULT true,
    "challenges" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "eventReminders" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL,

    CONSTRAINT "NotificationPref_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OutboundMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "sendAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClubPostProgress" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "downloads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClubPostProgress_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkbookProgress" (
    "userId" TEXT NOT NULL,
    "workbookKey" TEXT NOT NULL,
    "entries" JSONB NOT NULL DEFAULT '{}',
    "completedStepIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstTryStepIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkbookProgress_pkey" PRIMARY KEY ("userId","workbookKey")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImportBatch_userId_createdAt_idx" ON "ImportBatch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPref_unsubscribeToken_key" ON "NotificationPref"("unsubscribeToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutboundMessage_sentAt_sendAfter_idx" ON "OutboundMessage"("sentAt", "sendAfter");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutboundMessage_userId_channel_createdAt_idx" ON "OutboundMessage"("userId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_userId_status_dueDate_idx" ON "Task"("userId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Task_contactId_ruleKey_key" ON "Task"("contactId", "ruleKey");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Contact" ADD CONSTRAINT "Contact_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "NotificationPref" ADD CONSTRAINT "NotificationPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClubPostProgress" ADD CONSTRAINT "ClubPostProgress_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ClubPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClubPostProgress" ADD CONSTRAINT "ClubPostProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "WorkbookProgress" ADD CONSTRAINT "WorkbookProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Fast fuzzy search (Phase G)
CREATE INDEX IF NOT EXISTS "Firm_name_trgm_idx" ON "Firm" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Contact_fullName_trgm_idx" ON "Contact" USING GIN ("fullName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Contact_title_trgm_idx" ON "Contact" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Contact_email_trgm_idx" ON "Contact" USING GIN ("email" gin_trgm_ops);
