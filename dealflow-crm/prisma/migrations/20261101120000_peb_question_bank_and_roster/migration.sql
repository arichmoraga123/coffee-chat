-- Safe to run more than once (IF NOT EXISTS everywhere).
-- AlterTable
ALTER TABLE "public"."ClubMember" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN IF NOT EXISTS "correctIndex" INTEGER,
ADD COLUMN IF NOT EXISTS "explanation" TEXT,
ADD COLUMN IF NOT EXISTS "lessonId" TEXT,
ADD COLUMN IF NOT EXISTS "mcqEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "options" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."QuestionAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "chosenText" TEXT NOT NULL,
    "msToAnswer" INTEGER NOT NULL,
    "context" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."DailyQuestionSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "questionIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ClubRosterEntry" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubRosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ClubJoinRequest" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,

    CONSTRAINT "ClubJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuestionAttempt_userId_questionId_idx" ON "public"."QuestionAttempt"("userId", "questionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuestionAttempt_userId_createdAt_idx" ON "public"."QuestionAttempt"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DailyQuestionSet_userId_date_key" ON "public"."DailyQuestionSet"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClubRosterEntry_clubId_email_key" ON "public"."ClubRosterEntry"("clubId", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClubJoinRequest_clubId_status_idx" ON "public"."ClubJoinRequest"("clubId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClubJoinRequest_clubId_userId_key" ON "public"."ClubJoinRequest"("clubId", "userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."DailyQuestionSet" ADD CONSTRAINT "DailyQuestionSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."ClubRosterEntry" ADD CONSTRAINT "ClubRosterEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "public"."Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."ClubJoinRequest" ADD CONSTRAINT "ClubJoinRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "public"."Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."ClubJoinRequest" ADD CONSTRAINT "ClubJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

