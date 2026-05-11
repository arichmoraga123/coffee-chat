import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SchoolJoinButton } from "@/components/school-join-button";
import { cn } from "@/lib/utils";

export type SchoolProfileQuestion = { id: string; question: string; category: string; difficulty: string };
export type SchoolProfileAlumni = {
  id: string;
  firmName: string;
  role: string;
  vertical: string;
  gradYear: number | null;
};
export type SchoolProfileTimeline = {
  id: string;
  firmName: string;
  firmType: string;
  role: string;
  year: number;
  applicationOpen: Date | null;
  applicationClose: Date | null;
  firstRound: Date | null;
  notes: string | null;
};
export type SchoolProfileComp = {
  id: string;
  firmName: string;
  role: string;
  vertical: string;
  officeLocation: string | null;
  baseComp: number | null;
  totalComp: number | null;
  year: number;
};

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function typeLabel(type: string) {
  return type.replace(/-/g, " ");
}

export function SchoolProfileView({
  schoolId,
  name,
  shortName,
  location,
  type,
  domain,
  memberCount,
  questionsContributed,
  topCareerTracks,
  questions,
  alumni,
  timelines,
  compPreview,
  isUsersSchool,
}: {
  schoolId: string;
  name: string;
  shortName: string;
  location: string | null;
  type: string;
  domain: string;
  memberCount: number;
  questionsContributed: number;
  topCareerTracks: [string, number][];
  questions: SchoolProfileQuestion[];
  alumni: SchoolProfileAlumni[];
  timelines: SchoolProfileTimeline[];
  compPreview: SchoolProfileComp[];
  isUsersSchool: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/schools" className="text-xs text-amber-200/90 hover:underline">
        ← Schools
      </Link>

      <Card className="border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-50">{name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {shortName} · {domain}
            </p>
            {location ? <p className="mt-2 text-sm text-zinc-400">{location}</p> : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                type === "target"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : type === "semi-target"
                    ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
                    : "border-zinc-600 bg-zinc-950 text-zinc-300",
              )}
            >
              {typeLabel(type)}
            </span>
            {isUsersSchool ? (
              <span className="rounded-full border border-[#4a6fa5]/40 bg-[#4a6fa5]/15 px-3 py-1 text-xs font-medium text-[#b8cceb]">
                Your school
              </span>
            ) : (
              <SchoolJoinButton schoolId={schoolId} schoolShortName={shortName} />
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-400">
          <span>
            <span className="font-semibold text-zinc-200">{memberCount}</span> members
          </span>
          <span>
            <span className="font-semibold text-zinc-200">{questionsContributed}</span> questions contributed
          </span>
        </div>
      </Card>

      {topCareerTracks.length ? (
        <Card className="border-zinc-800 bg-zinc-900/40 p-4">
          <p className="section-label mb-2">Top career tracks (members)</p>
          <div className="flex flex-wrap gap-2">
            {topCareerTracks.map(([t, n]) => (
              <span key={t} className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200">
                {t} <span className="text-zinc-500">({n})</span>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {questions.length ? (
        <Card className="border-zinc-800 bg-zinc-900/40 p-4">
          <p className="section-label mb-3">Questions from this school</p>
          <ul className="space-y-2">
            {questions.map((q) => (
              <li key={q.id} className="rounded-lg border border-white/[0.06] bg-zinc-950/50 p-3">
                <p className="text-sm text-zinc-200">{q.question}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {q.category} · {q.difficulty}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/30 p-4">
          <p className="text-sm text-zinc-500">No question-bank rows linked to this campus yet.</p>
        </Card>
      )}

      {alumni.length ? (
        <Card className="border-zinc-800 bg-zinc-900/40 p-4">
          <p className="section-label mb-3">Alumni at target firms (verified)</p>
          <div className="space-y-2">
            {alumni.map((a) => (
              <div key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-white/[0.06] bg-zinc-950/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{a.firmName}</p>
                  <p className="text-xs text-zinc-400">
                    {a.role} · {a.vertical}
                    {a.gradYear ? ` · ’${String(a.gradYear).slice(-2)}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/30 p-4">
          <p className="text-sm text-zinc-500">No verified alumni records yet.</p>
        </Card>
      )}

      {timelines.length ? (
        <Card className="border-zinc-800 bg-zinc-900/40 p-4">
          <p className="section-label mb-3">School-specific recruiting timelines</p>
          <div className="space-y-3">
            {timelines.map((t) => (
              <div key={t.id} className="rounded-lg border border-white/[0.06] bg-zinc-950/50 p-3">
                <p className="text-sm font-medium text-zinc-100">
                  {t.firmName} — {t.role}{" "}
                  <span className="text-zinc-500">
                    ({t.year}) · {t.firmType}
                  </span>
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Apps open: {fmtDate(t.applicationOpen)}
                  {t.applicationClose ? ` · Close: ${fmtDate(t.applicationClose)}` : ""}
                  {t.firstRound ? ` · First round: ${fmtDate(t.firstRound)}` : ""}
                </p>
                {t.notes ? <p className="mt-1 text-xs text-zinc-500">{t.notes}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/30 p-4">
          <p className="text-sm text-zinc-500">No school-scoped timelines yet.</p>
        </Card>
      )}

      {compPreview.length ? (
        <Card className="border-zinc-800 bg-zinc-900/40 p-4">
          <p className="section-label mb-3">Recent comp submissions (this school)</p>
          <div className="space-y-2">
            {compPreview.map((c) => (
              <div key={c.id} className="flex flex-wrap justify-between gap-2 rounded border border-white/[0.06] bg-zinc-950/50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-zinc-100">{c.firmName}</p>
                  <p className="text-xs text-zinc-400">
                    {c.role} · {c.vertical}
                    {c.officeLocation ? ` · ${c.officeLocation}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  {c.baseComp != null ? <p className="text-zinc-200">${(c.baseComp / 1000).toFixed(0)}K base</p> : null}
                  {c.totalComp != null ? <p>TC ~${(c.totalComp / 1000).toFixed(0)}K</p> : null}
                  <p className="text-zinc-500">{c.year}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
