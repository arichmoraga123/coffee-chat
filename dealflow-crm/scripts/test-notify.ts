/** Phase K check: quiet hours, notify() queuing, and one daily run against the local database. Usage: npx tsx scripts/test-notify.ts */
import { prisma } from "@/lib/prisma";
import { isQuiet, quietUntil } from "@/lib/notify";
import { runDaily } from "@/lib/daily";

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) failed++;
};

async function main() {
  check(isQuiet(22, 21, 8) && isQuiet(3, 21, 8) && !isQuiet(8, 21, 8) && !isQuiet(12, 21, 8), "quiet hours wrap past midnight");
  check(isQuiet(13, 12, 14) && !isQuiet(14, 12, 14), "daytime quiet window");
  // 2026-11-02 03:00 UTC = 22:00 Eastern (EST) → texts wait until 8:00 Eastern = 13:00 UTC.
  const q = quietUntil("America/New_York", 21, 8, new Date("2026-11-02T03:00:00Z"));
  check(q.toISOString() === "2026-11-02T13:00:00.000Z", `queued text waits for 8 AM Eastern (${q.toISOString()})`);
  const day = quietUntil("America/New_York", 21, 8, new Date("2026-11-02T15:30:00Z"));
  check(day.toISOString() === "2026-11-02T15:30:00.000Z", "daytime sends now");

  const before = await prisma.notification.count({ where: { kind: "followup_digest" } });
  const r = await runDaily();
  console.log("daily:", JSON.stringify(r));
  const after = await prisma.notification.count({ where: { kind: "followup_digest" } });
  check(after - before === r.digests, "one digest notification per user with tasks due");
  const again = await runDaily();
  check(again.digests === 0, "running twice the same day sends no second digest");
  console.log(failed ? `${failed} FAILED` : "all passed");
  process.exit(failed ? 1 : 0);
}
void main();
