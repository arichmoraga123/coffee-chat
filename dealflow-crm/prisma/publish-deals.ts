/**
 * One-time backfill: publish all deals that were seeded or left as draft.
 * Run: npx tsx prisma/publish-deals.ts
 * Or run the SQL in Neon: UPDATE "Deal" SET status = 'published' WHERE status IS NULL OR status = 'draft';
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const n = await prisma.$executeRaw`
    UPDATE "Deal" SET status = 'published' WHERE status IS NULL OR status = 'draft'
  `;
  console.log("Deal publish backfill finished (raw row count from driver):", n);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
