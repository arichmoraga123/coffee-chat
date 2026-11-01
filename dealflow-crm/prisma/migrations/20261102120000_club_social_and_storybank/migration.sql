-- Club C-F (standings, bot review, profiles, DMs, challenges) and the storybank.
-- Safe to run more than once.

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "classYear" INTEGER,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reviewedKeep" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "shareDrill" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "shareFirms" BOOLEAN,
ADD COLUMN IF NOT EXISTS "shareLearning" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "shareTargets" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "signupIp" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClubActivity" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClubActivityReaction" (
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubActivityReaction_pkey" PRIMARY KEY ("activityId","userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConversationMember" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "challengeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Challenge" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "topic" JSONB NOT NULL DEFAULT '{}',
    "questionIds" TEXT[],
    "secondsPerQ" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "questionStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChallengeParticipant" (
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalMs" INTEGER NOT NULL DEFAULT 0,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("challengeId","userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChallengeAnswer" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "chosenText" TEXT NOT NULL DEFAULT '',
    "ms" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Story" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "rawText" TEXT NOT NULL DEFAULT '',
    "polished" JSONB,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClubActivity_clubId_createdAt_idx" ON "ClubActivity"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConversationMember_userId_idx" ON "ConversationMember"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Challenge_clubId_mode_createdAt_idx" ON "Challenge"("clubId", "mode", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChallengeParticipant_userId_idx" ON "ChallengeParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeAnswer_challengeId_userId_questionId_key" ON "ChallengeAnswer"("challengeId", "userId", "questionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Story_userId_idx" ON "Story"("userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClubActivity" ADD CONSTRAINT "ClubActivity_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClubActivity" ADD CONSTRAINT "ClubActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClubActivityReaction" ADD CONSTRAINT "ClubActivityReaction_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ClubActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ClubActivityReaction" ADD CONSTRAINT "ClubActivityReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ChallengeAnswer" ADD CONSTRAINT "ChallengeAnswer_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ChallengeAnswer" ADD CONSTRAINT "ChallengeAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Story" ADD CONSTRAINT "Story_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

