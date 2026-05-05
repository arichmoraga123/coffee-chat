"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ContactProfilePayload = {
  id: string;
  firmId: string;
  firmName: string;
  firmType: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  group: string;
  title: string;
  location: string;
  school: string;
  recruitingCategory: string;
  relationshipStrength: number;
  referralProbability: string;
  notes: string;
  lastInteractionDate: string | null;
  undergradSchool: string | null;
  gradSchool: string | null;
  graduationYear: number | null;
  hometown: string | null;
  previousFirms: string[];
  careerPath: string | null;
  clubs: string[];
  sports: string[];
  greekLife: string | null;
  howWeMet: string | null;
  referredBy: string | null;
  mutualConnections: string[];
  warmthScore: string;
  hiringTimeline: string | null;
  whatTheyLookFor: string | null;
  referralPotential: string | null;
  openRoles: string | null;
  notableDeals: string[];
};

type FirmOption = { id: string; name: string };

function joinLines(arr: string[]) {
  return arr.join("\n");
}

function splitLines(s: string) {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const sectionTitle = "mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500";

export function ContactProfileForm({
  profile,
  firms,
}: {
  profile: ContactProfilePayload;
  firms: FirmOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firmId, setFirmId] = useState(profile.firmId);
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? "");
  const [group, setGroup] = useState(profile.group);
  const [title, setTitle] = useState(profile.title);
  const [location, setLocation] = useState(profile.location);
  const [school, setSchool] = useState(profile.school);
  const [recruitingCategory, setRecruitingCategory] = useState(profile.recruitingCategory);
  const [relationshipStrength, setRelationshipStrength] = useState(profile.relationshipStrength);
  const [referralProbability, setReferralProbability] = useState(profile.referralProbability);
  const [notes, setNotes] = useState(profile.notes);
  const [undergradSchool, setUndergradSchool] = useState(profile.undergradSchool ?? "");
  const [gradSchool, setGradSchool] = useState(profile.gradSchool ?? "");
  const [graduationYear, setGraduationYear] = useState(
    profile.graduationYear != null ? String(profile.graduationYear) : "",
  );
  const [hometown, setHometown] = useState(profile.hometown ?? "");
  const [previousFirms, setPreviousFirms] = useState(joinLines(profile.previousFirms));
  const [careerPath, setCareerPath] = useState(profile.careerPath ?? "");
  const [clubs, setClubs] = useState(joinLines(profile.clubs));
  const [sports, setSports] = useState(joinLines(profile.sports));
  const [greekLife, setGreekLife] = useState(profile.greekLife ?? "");
  const [howWeMet, setHowWeMet] = useState(profile.howWeMet ?? "");
  const [referredBy, setReferredBy] = useState(profile.referredBy ?? "");
  const [mutualConnections, setMutualConnections] = useState(joinLines(profile.mutualConnections));
  const [warmthScore, setWarmthScore] = useState(profile.warmthScore);
  const [hiringTimeline, setHiringTimeline] = useState(profile.hiringTimeline ?? "");
  const [whatTheyLookFor, setWhatTheyLookFor] = useState(profile.whatTheyLookFor ?? "");
  const [referralPotential, setReferralPotential] = useState(profile.referralPotential ?? "");
  const [openRoles, setOpenRoles] = useState(profile.openRoles ?? "");
  const [notableDeals, setNotableDeals] = useState(joinLines(profile.notableDeals));

  const snap = JSON.stringify(profile);
  useEffect(() => {
    // Sync form when server data changes (same JSON as last render is skipped by React).
    setFirmId(profile.firmId);
    setFullName(profile.fullName);
    setEmail(profile.email);
    setPhone(profile.phone ?? "");
    setLinkedinUrl(profile.linkedinUrl ?? "");
    setGroup(profile.group);
    setTitle(profile.title);
    setLocation(profile.location);
    setSchool(profile.school);
    setRecruitingCategory(profile.recruitingCategory);
    setRelationshipStrength(profile.relationshipStrength);
    setReferralProbability(profile.referralProbability);
    setNotes(profile.notes);
    setUndergradSchool(profile.undergradSchool ?? "");
    setGradSchool(profile.gradSchool ?? "");
    setGraduationYear(profile.graduationYear != null ? String(profile.graduationYear) : "");
    setHometown(profile.hometown ?? "");
    setPreviousFirms(joinLines(profile.previousFirms));
    setCareerPath(profile.careerPath ?? "");
    setClubs(joinLines(profile.clubs));
    setSports(joinLines(profile.sports));
    setGreekLife(profile.greekLife ?? "");
    setHowWeMet(profile.howWeMet ?? "");
    setReferredBy(profile.referredBy ?? "");
    setMutualConnections(joinLines(profile.mutualConnections));
    setWarmthScore(profile.warmthScore);
    setHiringTimeline(profile.hiringTimeline ?? "");
    setWhatTheyLookFor(profile.whatTheyLookFor ?? "");
    setReferralPotential(profile.referralPotential ?? "");
    setOpenRoles(profile.openRoles ?? "");
    setNotableDeals(joinLines(profile.notableDeals));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-sync when serialized profile changes
  }, [snap]);

  const fieldClass =
    "w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-600";

  const save = async () => {
    setBusy(true);
    setError(null);
    const gy = graduationYear.trim() === "" ? null : Number(graduationYear);
    const res = await fetch(`/api/contacts/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firmId,
        fullName,
        email,
        phone: phone.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        group,
        title,
        location,
        school,
        recruitingCategory,
        relationshipStrength,
        referralProbability,
        notes,
        undergradSchool: undergradSchool.trim() || null,
        gradSchool: gradSchool.trim() || null,
        graduationYear: gy != null && Number.isFinite(gy) ? gy : null,
        hometown: hometown.trim() || null,
        previousFirms: splitLines(previousFirms),
        careerPath: careerPath.trim() || null,
        clubs: splitLines(clubs),
        sports: splitLines(sports),
        greekLife: greekLife.trim() || null,
        howWeMet: howWeMet.trim() || null,
        referredBy: referredBy.trim() || null,
        mutualConnections: splitLines(mutualConnections),
        warmthScore,
        hiringTimeline: hiringTimeline.trim() || null,
        whatTheyLookFor: whatTheyLookFor.trim() || null,
        referralPotential: referralPotential.trim() || null,
        openRoles: openRoles.trim() || null,
        notableDeals: splitLines(notableDeals),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Save failed");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-200">Profile</h2>
        <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className={sectionTitle}>Basic info</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input className={fieldClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input className={fieldClass} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            className={fieldClass}
            placeholder="LinkedIn URL"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />
          <select className={fieldClass} value={firmId} onChange={(e) => setFirmId(e.target.value)}>
            {firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Input className={fieldClass} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input className={fieldClass} placeholder="Group" value={group} onChange={(e) => setGroup(e.target.value)} />
          <Input
            className={fieldClass}
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Input className={fieldClass} placeholder="School" value={school} onChange={(e) => setSchool(e.target.value)} />
          <select
            className={fieldClass}
            value={recruitingCategory}
            onChange={(e) => setRecruitingCategory(e.target.value)}
          >
            {["IB", "PE", "GE", "VC", "HF"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Input
            className={fieldClass}
            type="number"
            min={1}
            max={10}
            value={relationshipStrength}
            onChange={(e) => setRelationshipStrength(Number(e.target.value))}
          />
          <select
            className={fieldClass}
            value={referralProbability}
            onChange={(e) => setReferralProbability(e.target.value)}
          >
            {["LOW", "MEDIUM", "HIGH"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <textarea
            className={`${fieldClass} min-h-[72px] sm:col-span-2`}
            placeholder="General notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className={sectionTitle}>Background &amp; education</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            className={fieldClass}
            placeholder="Undergrad school"
            value={undergradSchool}
            onChange={(e) => setUndergradSchool(e.target.value)}
          />
          <Input
            className={fieldClass}
            placeholder="Grad school"
            value={gradSchool}
            onChange={(e) => setGradSchool(e.target.value)}
          />
          <Input
            className={fieldClass}
            placeholder="Graduation year"
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
          />
          <Input
            className={fieldClass}
            placeholder="Hometown"
            value={hometown}
            onChange={(e) => setHometown(e.target.value)}
          />
          <textarea
            className={`${fieldClass} min-h-[72px] sm:col-span-2`}
            placeholder="Previous firms (one per line)"
            value={previousFirms}
            onChange={(e) => setPreviousFirms(e.target.value)}
          />
          <textarea
            className={`${fieldClass} min-h-[80px] sm:col-span-2`}
            placeholder="Career path summary"
            value={careerPath}
            onChange={(e) => setCareerPath(e.target.value)}
          />
        </div>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className={sectionTitle}>Clubs &amp; activities</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <textarea
            className={`${fieldClass} min-h-[72px] sm:col-span-2`}
            placeholder="Clubs (one per line)"
            value={clubs}
            onChange={(e) => setClubs(e.target.value)}
          />
          <textarea
            className={`${fieldClass} min-h-[72px] sm:col-span-2`}
            placeholder="Sports (one per line)"
            value={sports}
            onChange={(e) => setSports(e.target.value)}
          />
          <Input
            className={`${fieldClass} sm:col-span-2`}
            placeholder="Greek life"
            value={greekLife}
            onChange={(e) => setGreekLife(e.target.value)}
          />
        </div>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className={sectionTitle}>Relationship context</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            className={`${fieldClass} sm:col-span-2`}
            placeholder="How we met"
            value={howWeMet}
            onChange={(e) => setHowWeMet(e.target.value)}
          />
          <Input
            className={`${fieldClass} sm:col-span-2`}
            placeholder="Referred by"
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
          />
          <textarea
            className={`${fieldClass} min-h-[72px] sm:col-span-2`}
            placeholder="Mutual connections (one per line)"
            value={mutualConnections}
            onChange={(e) => setMutualConnections(e.target.value)}
          />
          <select className={`${fieldClass} sm:col-span-2`} value={warmthScore} onChange={(e) => setWarmthScore(e.target.value)}>
            {["COLD", "WARM", "HOT", "ADVOCATE"].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className={sectionTitle}>Recruiting intelligence</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            className={`${fieldClass} sm:col-span-2`}
            placeholder="Hiring timeline"
            value={hiringTimeline}
            onChange={(e) => setHiringTimeline(e.target.value)}
          />
          <textarea
            className={`${fieldClass} min-h-[80px] sm:col-span-2`}
            placeholder="What they look for"
            value={whatTheyLookFor}
            onChange={(e) => setWhatTheyLookFor(e.target.value)}
          />
          <select
            className={fieldClass}
            value={referralPotential || ""}
            onChange={(e) => setReferralPotential(e.target.value)}
          >
            <option value="">Referral potential…</option>
            {["UNLIKELY", "POSSIBLE", "LIKELY", "OFFERED"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Input
            className={fieldClass}
            placeholder="Open roles"
            value={openRoles}
            onChange={(e) => setOpenRoles(e.target.value)}
          />
          <textarea
            className={`${fieldClass} min-h-[80px] sm:col-span-2`}
            placeholder="Notable deals (one per line)"
            value={notableDeals}
            onChange={(e) => setNotableDeals(e.target.value)}
          />
        </div>
      </Card>
    </div>
  );
}
