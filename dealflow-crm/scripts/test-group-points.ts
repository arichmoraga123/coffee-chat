/** npm run test-group-points — study group competition scoring rules. */
import { DAILY_CAP, scoreDays, duelCount, etDay, levelFor, scoreActivities, teamScore, weekStartET, weekStreak, type Activity } from "../src/lib/group-points-rules";

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
const at = (s: string) => new Date(s);

const events: Activity[] = [
  { userId: "a", kind: "correct", key: "q1", at: at("2026-11-04T15:00:00Z") },
  { userId: "a", kind: "correct", key: "q1", at: at("2026-11-04T16:00:00Z") }, // same question, same day: no points
  { userId: "a", kind: "correct", key: "q1", at: at("2026-11-05T16:00:00Z") }, // next day: counts again
  { userId: "a", kind: "lesson", at: at("2026-11-04T17:00:00Z") },
  { userId: "b", kind: "dailySet", at: at("2026-11-04T17:00:00Z") },
  { userId: "b", kind: "challenge", at: at("2026-11-04T18:00:00Z") },
];
const r = scoreActivities(events);
eq("correct answers count once per question per day", r.get("a")?.byKind.correct, 4);
eq("lesson points", r.get("a")?.total, 29);
eq("daily set + challenge", r.get("b")?.total, 15);

// Daily cap: 10 lessons in a day = 250 raw, capped at 150.
const grind: Activity[] = Array.from({ length: 10 }, (_, i) => ({ userId: "c", kind: "lesson" as const, at: at(`2026-11-04T1${i}:00:00Z`) }));
eq("daily cap", r && scoreActivities(grind).get("c")?.total, DAILY_CAP);
eq("capped points reported", scoreActivities(grind).get("c")?.capped, 100);
// The cap resets the next day (Eastern): 23:30 ET Nov 4 vs 00:30 ET Nov 5.
eq("ET day boundary", [etDay(at("2026-11-05T04:30:00Z")), etDay(at("2026-11-05T05:30:00Z"))], ["2026-11-04", "2026-11-05"]);

const days = scoreDays([
  { userId: "a", day: "2026-11-04", correct: 1, lesson: 1, dailySet: 0, challenge: 0 },
  { userId: "a", day: "2026-11-05", correct: 1, lesson: 0, dailySet: 0, challenge: 0 },
  { userId: "c", day: "2026-11-04", correct: 30, lesson: 5, dailySet: 1, challenge: 0 },
]);
eq("scoreDays matches the activity rules", days.get("a")?.total, scoreActivities(events).get("a")?.total);
eq("scoreDays cap: lessons first, then the rest", [days.get("c")?.total, days.get("c")?.byKind.lesson, days.get("c")?.byKind.correct], [150, 125, 15]);

eq("team score = top 5", teamScore([10, 50, 20, 40, 30, 60, 5]), 200);
eq("duel counts the smaller team", duelCount(3, 8), 3);
eq("duel max 5", duelCount(8, 8), 5);

eq("week starts Monday 00:00 ET (EST)", weekStartET(at("2026-11-06T12:00:00Z")).toISOString(), "2026-11-02T05:00:00.000Z");
eq("week starts Monday 00:00 ET (EDT)", weekStartET(at("2026-10-28T12:00:00Z")).toISOString(), "2026-10-26T04:00:00.000Z");
eq("Sunday night ET is still the same week", weekStartET(at("2026-11-09T04:30:00Z")).toISOString(), "2026-11-02T05:00:00.000Z");

eq("levels", [levelFor(0).name, levelFor(999).name, levelFor(1000).name, levelFor(20000).name], ["Bronze", "Bronze", "Silver", "Diamond"]);
eq("level progress", levelFor(2000).progress, 0.5);
eq("streak", weekStreak([120, 300, 40, 500], 150), 3);
eq("streak without this week yet", weekStreak([120, 300, 40], 20), 2);

console.log(fails ? `\n${fails} failed` : "\nGroup points checks pass.");
process.exit(fails ? 1 : 0);
