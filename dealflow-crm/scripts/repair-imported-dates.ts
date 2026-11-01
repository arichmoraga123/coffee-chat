/**
 * Fixes contacts the old importer marked as "contacted" on the upload / LinkedIn connection date.
 *   npx tsx scripts/repair-imported-dates.ts --dry-run      ← review this first
 *   npx tsx scripts/repair-imported-dates.ts                ← apply for everyone
 *   npx tsx scripts/repair-imported-dates.ts --network      ← also move never-contacted LinkedIn imports to Network
 */
import { PrismaClient } from "@prisma/client";
import { applyRepair, moveToNetwork, planRepair } from "../src/lib/data-repair";
import { syncFollowupTasks } from "../src/lib/followup-tasks";

async function main() {
  const dry = process.argv.includes("--dry-run");
  const network = process.argv.includes("--network");
  const prisma = new PrismaClient();
  try {
    const plans = await planRepair(prisma);
    let i = 0, d = 0, n = 0;
    for (const p of plans) {
      console.log(
        `${p.email.padEnd(36)} remove ${String(p.interactionsToRemove.length).padStart(4)} importer interactions · reset ${String(p.datesToReset.length).padStart(4)} last-contacted dates · ${p.networkCandidates.length} LinkedIn contacts could move to Network`,
      );
      i += p.interactionsToRemove.length;
      d += p.datesToReset.length;
      n += p.networkCandidates.length;
      if (!dry) {
        await applyRepair(prisma, p);
        if (network && p.networkCandidates.length) await moveToNetwork(prisma, p.userId, p.networkCandidates);
        await syncFollowupTasks(p.userId);
      }
    }
    console.log(`\n${dry ? "DRY RUN — nothing changed. " : ""}Total: ${i} interactions, ${d} dates, ${n} Network candidates across ${plans.length} users.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
