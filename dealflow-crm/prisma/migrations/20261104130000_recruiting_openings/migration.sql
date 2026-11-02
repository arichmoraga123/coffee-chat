-- Part B: recruiting openings uploaded by admins/officers, member reminders, pipeline link, upload undo data.

CREATE TABLE IF NOT EXISTS "Opening" (
  "id" TEXT NOT NULL,
  "clubId" TEXT,
  "firmName" TEXT NOT NULL,
  "firmNorm" TEXT NOT NULL,
  "program" TEXT NOT NULL,
  "roleType" TEXT,
  "track" TEXT,
  "group" TEXT,
  "classYears" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "recruitingSummer" INTEGER,
  "city" TEXT NOT NULL,
  "opensOn" TIMESTAMP(3),
  "deadline" TIMESTAMP(3),
  "deadlineType" TEXT NOT NULL DEFAULT 'Unknown',
  "statusOverride" TEXT,
  "link" TEXT,
  "source" TEXT,
  "notes" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "importBatchId" TEXT,
  "createdById" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Opening_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Opening_dedupeKey_key" ON "Opening"("dedupeKey");
CREATE INDEX IF NOT EXISTS "Opening_archivedAt_deadline_idx" ON "Opening"("archivedAt", "deadline");
CREATE INDEX IF NOT EXISTS "Opening_firmNorm_idx" ON "Opening"("firmNorm");

CREATE TABLE IF NOT EXISTS "OpeningReminder" (
  "userId" TEXT NOT NULL,
  "openingId" TEXT NOT NULL,
  "remindOpen" BOOLEAN NOT NULL DEFAULT true,
  "remindDaysBefore" INTEGER NOT NULL DEFAULT 7,
  "openSentAt" TIMESTAMP(3),
  "deadlineSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningReminder_pkey" PRIMARY KEY ("userId", "openingId")
);
CREATE INDEX IF NOT EXISTS "OpeningReminder_openingId_idx" ON "OpeningReminder"("openingId");

ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "openingId" TEXT;
CREATE INDEX IF NOT EXISTS "Opportunity_userId_openingId_idx" ON "Opportunity"("userId", "openingId");

ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "undoData" JSONB;

DO $$ BEGIN
  ALTER TABLE "OpeningReminder" ADD CONSTRAINT "OpeningReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OpeningReminder" ADD CONSTRAINT "OpeningReminder_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "Opening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "Opening"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
