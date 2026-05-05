ALTER TABLE "Question"
ADD COLUMN IF NOT EXISTS "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Question"
SET "keywords" = ARRAY[]::TEXT[]
WHERE "keywords" IS NULL;

ALTER TABLE "Question"
ALTER COLUMN "keywords" SET NOT NULL;
