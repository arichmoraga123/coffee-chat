-- Desktop sidebar collapsed choice, saved per user.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sidebarCollapsed" BOOLEAN;
