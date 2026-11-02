-- Fit questions, Group Finder and admin-editable fit content (Fit & Practice spec F2–F4).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hometown" TEXT;

CREATE TABLE IF NOT EXISTS "FitAnswer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "variant" TEXT NOT NULL DEFAULT '',
  "builder" JSONB NOT NULL DEFAULT '{}',
  "linkedStoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "includedInteractionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "draft" TEXT NOT NULL DEFAULT '',
  "feedback" JSONB,
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "selfRating" TEXT,
  "practicedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FitAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FitAnswer_userId_questionId_variant_key" ON "FitAnswer"("userId", "questionId", "variant");
CREATE INDEX IF NOT EXISTS "FitAnswer_userId_idx" ON "FitAnswer"("userId");

CREATE TABLE IF NOT EXISTS "FitAnswerVersion" (
  "id" TEXT NOT NULL,
  "answerId" TEXT NOT NULL,
  "draft" TEXT NOT NULL,
  "builder" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FitAnswerVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FitAnswerVersion_answerId_createdAt_idx" ON "FitAnswerVersion"("answerId", "createdAt");

CREATE TABLE IF NOT EXISTS "GroupFinderResult" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "results" JSONB NOT NULL,
  "topGroupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupFinderResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GroupFinderResult_userId_createdAt_idx" ON "GroupFinderResult"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "GroupFinderResult_topGroupId_idx" ON "GroupFinderResult"("topGroupId");

CREATE TABLE IF NOT EXISTS "FitContent" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FitContent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FitContent_kind_sortOrder_idx" ON "FitContent"("kind", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "FitAnswer" ADD CONSTRAINT "FitAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FitAnswerVersion" ADD CONSTRAINT "FitAnswerVersion_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "FitAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "GroupFinderResult" ADD CONSTRAINT "GroupFinderResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
