-- CreateTable
CREATE TABLE "public"."LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "blockState" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL DEFAULT 0,
    "deepDiveXp" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReviewItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LessonResource" (
    "id" TEXT NOT NULL,
    "workbookKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "blobUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResourceDownload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MentorQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "blockId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "public" BOOLEAN NOT NULL DEFAULT false,
    "seenByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonProgress_lessonId_idx" ON "public"."LessonProgress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "public"."LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "ReviewItem_userId_resolved_idx" ON "public"."ReviewItem"("userId", "resolved");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewItem_userId_lessonId_blockId_prompt_key" ON "public"."ReviewItem"("userId", "lessonId", "blockId", "prompt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonResource_workbookKey_kind_version_key" ON "public"."LessonResource"("workbookKey", "kind", "version");

-- CreateIndex
CREATE INDEX "ResourceDownload_resourceId_idx" ON "public"."ResourceDownload"("resourceId");

-- CreateIndex
CREATE INDEX "MentorQuestion_lessonId_status_idx" ON "public"."MentorQuestion"("lessonId", "status");

-- CreateIndex
CREATE INDEX "MentorQuestion_userId_idx" ON "public"."MentorQuestion"("userId");

-- AddForeignKey
ALTER TABLE "public"."LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewItem" ADD CONSTRAINT "ReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MentorQuestion" ADD CONSTRAINT "MentorQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

