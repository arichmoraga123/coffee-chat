-- Study group competition: open groups + join codes, each person's team, and group duels.

ALTER TABLE "StudyGroup" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "StudyGroup" ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'invite';
ALTER TABLE "StudyGroup" ADD COLUMN IF NOT EXISTS "joinCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "StudyGroup_joinCode_key" ON "StudyGroup"("joinCode");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "teamGroupId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "teamJoinedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "GroupDuel" (
  "id" TEXT NOT NULL,
  "challengerId" TEXT NOT NULL,
  "opponentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "durationDays" INTEGER NOT NULL DEFAULT 3,
  "createdById" TEXT NOT NULL,
  "respondedById" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "challengerMembers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "opponentMembers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "challengerScore" INTEGER,
  "opponentScore" INTEGER,
  "winnerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "GroupDuel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GroupDuel_challengerId_status_idx" ON "GroupDuel"("challengerId", "status");
CREATE INDEX IF NOT EXISTS "GroupDuel_opponentId_status_idx" ON "GroupDuel"("opponentId", "status");
CREATE INDEX IF NOT EXISTS "GroupDuel_status_endsAt_idx" ON "GroupDuel"("status", "endsAt");

DO $$ BEGIN
  ALTER TABLE "GroupDuel" ADD CONSTRAINT "GroupDuel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "GroupDuel" ADD CONSTRAINT "GroupDuel_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- People already in exactly one group get it as their team.
UPDATE "User" u SET "teamGroupId" = m."groupId", "teamJoinedAt" = CURRENT_TIMESTAMP
FROM (SELECT "userId", MIN("groupId") AS "groupId" FROM "StudyGroupMember" GROUP BY "userId" HAVING COUNT(*) = 1) m
WHERE u."id" = m."userId" AND u."teamGroupId" IS NULL;
