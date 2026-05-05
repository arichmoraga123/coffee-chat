import type { Prisma } from "@prisma/client";
import { RecruitingCategory, ReferralProbability } from "@prisma/client";
import { normalizeStringArray } from "@/lib/form-arrays";
import { normalizeWarmthScore } from "@/lib/contact-profile";

function optStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function optInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function patchOptString(
  body: Record<string, unknown>,
  key: string,
  data: Prisma.ContactUpdateInput,
  field: keyof Prisma.ContactUpdateInput,
) {
  if (!(key in body)) return;
  const v = body[key];
  if (v === null) (data as Record<string, unknown>)[field] = null;
  else {
    const s = String(v).trim();
    (data as Record<string, unknown>)[field] = s === "" ? null : s;
  }
}

/** Extra fields for Contact create (beyond core POST). */
export function extendedContactCreateData(body: Record<string, unknown>) {
  const warmth = normalizeWarmthScore(body.warmthScore) ?? "COLD";
  return {
    undergradSchool: optStr(body.undergradSchool),
    gradSchool: optStr(body.gradSchool),
    graduationYear: optInt(body.graduationYear),
    hometown: optStr(body.hometown),
    previousFirms: normalizeStringArray(body.previousFirms),
    careerPath: optStr(body.careerPath),
    clubs: normalizeStringArray(body.clubs),
    sports: normalizeStringArray(body.sports),
    greekLife: optStr(body.greekLife),
    howWeMet: optStr(body.howWeMet),
    referredBy: optStr(body.referredBy),
    mutualConnections: normalizeStringArray(body.mutualConnections),
    warmthScore: warmth,
    hiringTimeline: optStr(body.hiringTimeline),
    whatTheyLookFor: optStr(body.whatTheyLookFor),
    referralPotential: optStr(body.referralPotential),
    openRoles: optStr(body.openRoles),
    notableDeals: normalizeStringArray(body.notableDeals),
  };
}

export function buildContactPatchData(body: Record<string, unknown>): Prisma.ContactUpdateInput {
  const data: Prisma.ContactUpdateInput = {};

  if ("fullName" in body) data.fullName = String(body.fullName ?? "").trim();
  if ("email" in body) data.email = String(body.email ?? "").trim();
  if ("phone" in body) data.phone = body.phone ? String(body.phone).trim() : null;
  if ("linkedinUrl" in body) {
    data.linkedinUrl = body.linkedinUrl ? String(body.linkedinUrl).trim() : null;
  }
  if ("firmId" in body && typeof body.firmId === "string") {
    data.firm = { connect: { id: body.firmId } };
  }
  if ("group" in body) data.group = String(body.group ?? "").trim();
  if ("title" in body) data.title = String(body.title ?? "").trim();
  if ("location" in body) data.location = String(body.location ?? "").trim();
  if ("school" in body) data.school = String(body.school ?? "").trim();
  if ("recruitingCategory" in body) {
    data.recruitingCategory = body.recruitingCategory as RecruitingCategory;
  }
  if ("relationshipStrength" in body) {
    data.relationshipStrength = Number(body.relationshipStrength ?? 1);
  }
  if ("referralProbability" in body) {
    data.referralProbability = body.referralProbability as ReferralProbability;
  }
  if ("notes" in body) data.notes = String(body.notes ?? "");
  if ("lastInteractionDate" in body) {
    data.lastInteractionDate = body.lastInteractionDate
      ? new Date(String(body.lastInteractionDate))
      : null;
  }

  patchOptString(body, "undergradSchool", data, "undergradSchool");
  patchOptString(body, "gradSchool", data, "gradSchool");
  if ("graduationYear" in body) data.graduationYear = optInt(body.graduationYear);
  patchOptString(body, "hometown", data, "hometown");
  if ("previousFirms" in body) data.previousFirms = normalizeStringArray(body.previousFirms);
  patchOptString(body, "careerPath", data, "careerPath");
  if ("clubs" in body) data.clubs = normalizeStringArray(body.clubs);
  if ("sports" in body) data.sports = normalizeStringArray(body.sports);
  patchOptString(body, "greekLife", data, "greekLife");
  patchOptString(body, "howWeMet", data, "howWeMet");
  patchOptString(body, "referredBy", data, "referredBy");
  if ("mutualConnections" in body) {
    data.mutualConnections = normalizeStringArray(body.mutualConnections);
  }
  if ("warmthScore" in body) {
    const w = normalizeWarmthScore(body.warmthScore);
    if (w) data.warmthScore = w;
  }
  patchOptString(body, "hiringTimeline", data, "hiringTimeline");
  patchOptString(body, "whatTheyLookFor", data, "whatTheyLookFor");
  patchOptString(body, "referralPotential", data, "referralPotential");
  patchOptString(body, "openRoles", data, "openRoles");
  if ("notableDeals" in body) data.notableDeals = normalizeStringArray(body.notableDeals);

  return data;
}
