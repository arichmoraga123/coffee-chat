/**
 * Loads a roster CSV (email,name,role) into PE@Broad and links any existing users.
 *   npm run roster:import content/private/pebroad-roster.csv
 * Safe to run again: entries are upserted, never deleted.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { getPeBroadClub, parseRosterCsv, upsertRoster } from "../src/lib/club-roster";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run roster:import <path/to/roster.csv>");
    process.exit(1);
  }
  const { rows, errors } = parseRosterCsv(readFileSync(file, "utf8"));
  errors.forEach((e) => console.warn("skip:", e));
  const prisma = new PrismaClient();
  try {
    const club = await getPeBroadClub(prisma);
    const r = await upsertRoster(club.id, rows, prisma);
    console.log(`${club.name}: ${r.created} added, ${r.updated} updated, ${r.linkedUsers} existing users linked.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
