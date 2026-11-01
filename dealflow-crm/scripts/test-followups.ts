/** npm run test-followups — every rule in the follow-up table, plus the sample template data. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextFollowup, parseKind, type FollowupInteraction } from "../src/lib/followups";
import { parseCsv } from "../src/lib/csv";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const day = (x: Date | null | undefined) => x?.toISOString().slice(0, 10);
const I = (date: string, kind: FollowupInteraction["kind"], extra: Partial<FollowupInteraction> = {}): FollowupInteraction => ({ date: d(date), kind, ...extra });
let n = 0;
const check = (name: string, got: unknown, want: unknown) => {
  assert.deepEqual(got, want, `${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  n++;
};

// Table rows (fixed dates; Oct 21 2026 is a Wednesday).
let r = nextFollowup({}, [I("2026-10-21", "cold_email")]);
check("cold → bump1 +5 business days", [r.followup?.kind, day(r.followup?.due)], ["bump1", "2026-10-28"]);
r = nextFollowup({}, [I("2026-10-12", "linkedin_message"), I("2026-10-19", "followup_email")]);
check("bump1 sent → bump2 +7 business days", [r.followup?.kind, day(r.followup?.due)], ["bump2", "2026-10-28"]);
r = nextFollowup({}, [I("2026-09-01", "cold_email"), I("2026-09-08", "followup_email"), I("2026-09-17", "followup_email")]);
check("bump2 sent → gone cold, re-engage in 60 days", [r.followup, r.goneCold, day(r.reengageOn)], [null, true, "2026-11-16"]);
r = nextFollowup({}, [I("2026-10-06", "cold_email"), I("2026-10-08", "replied")]);
check("replied → reply +1 business day", [r.followup?.kind, day(r.followup?.due)], ["reply", "2026-10-09"]);
for (const k of ["coffee_chat", "phone_call", "video_call", "in_person", "interview"] as const) {
  r = nextFollowup({}, [I("2026-10-14", k)]);
  check(`${k} → thank-you +1 day`, [r.followup?.kind, day(r.followup?.due)], ["thank_you", "2026-10-15"]);
}
r = nextFollowup({}, [I("2026-10-14", "coffee_chat"), I("2026-10-15", "thank_you")]);
check("thank-you after chat → update +21 days", [r.followup?.kind, day(r.followup?.due)], ["update", "2026-11-05"]);
for (const [p, due] of [["A", "2026-12-01"], ["B", "2026-12-15"], ["C", "2027-01-12"]] as const) {
  r = nextFollowup({ priority: p }, [I("2026-10-14", "coffee_chat"), I("2026-10-15", "thank_you"), I("2026-10-20", "followup_email")]);
  check(`quiet after conversation (priority ${p})`, [r.followup?.kind, day(r.followup?.due)], ["check_in", due]);
}
r = nextFollowup({}, [I("2026-10-03", "referral")]);
check("referral → check +7 days", [r.followup?.kind, day(r.followup?.due)], ["referral_check", "2026-10-10"]);
r = nextFollowup({}, [I("2026-10-29", "event")]);
check("event → follow-up +2 days", [r.followup?.kind, day(r.followup?.due)], ["event_followup", "2026-10-31"]);
r = nextFollowup({}, [I("2026-10-21", "cold_email", { nextStepDue: d("2026-11-02"), nextStep: "Call" })]);
check("explicit Next Step Due overrides", [r.followup?.kind, day(r.followup?.due)], ["next_step", "2026-11-02"]);
for (const c of [{ list: "network" }, { doNotContact: true }, { notPursuing: true }, { deletedAt: new Date() }]) {
  check(`no reminders for ${JSON.stringify(c)}`, nextFollowup(c, [I("2026-10-21", "cold_email")]).followup, null);
}
r = nextFollowup({}, [I("2026-10-06", "cold_email"), I("2026-10-14", "followup_email")]);
check("follow-up after unanswered cold counts as a bump", r.followup?.kind, "bump2");

// Sample template data: every interaction parses, and Priya's Oct 21 cold email → bump Oct 28.
const rows = parseCsv(readFileSync("public/templates/prospect-interactions-sample.csv", "utf8")).slice(1);
const byEmail = new Map<string, FollowupInteraction[]>();
for (const cells of rows) {
  const kind = parseKind(cells[5]);
  assert.ok(kind, `unknown type "${cells[5]}"`);
  const due = cells[10] ? d(cells[10]) : null;
  byEmail.set(cells[0], [...(byEmail.get(cells[0]) ?? []), { date: d(cells[4]), kind: kind!, nextStep: cells[9] || null, nextStepDue: due }]);
}
r = nextFollowup({}, byEmail.get("pnatarajan@northgate.example")!);
check("Priya Natarajan sample → bump Oct 28", [r.followup?.kind, day(r.followup?.due)], ["bump1", "2026-10-28"]);
r = nextFollowup({}, byEmail.get("mbennett@westbrookadv.example")!);
check("Marcus Bennett sample → update after thank-you", [r.followup?.kind, day(r.followup?.due)], ["update", "2026-11-14"]);
console.log(`✓ ${n} follow-up checks passed`);
