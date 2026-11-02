import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { fileToTabs } from "@/lib/sheet-rows";
import { commitOpeningsImport, planOpeningsImport } from "@/lib/openings-import";
import { openingsAccess } from "@/lib/openings-data";
import { writeItem } from "@/lib/club-publish-write";
import { deliver } from "@/lib/club-publish";

export const maxDuration = 60;

/**
 * Openings upload (admins and officers). multipart: file, mode=preview|commit, archiveMissing, mergeFirms (JSON),
 * audience=club|all (admins only), clubId (which club when an officer of several), postToClub.
 */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await openingsAccess(userId);
  if (!access.canEdit) return NextResponse.json({ error: "Only admins and club officers can upload openings." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: "Upload an .xlsx or .csv file." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File is too large (max 10 MB)." }, { status: 400 });

  // Which list the openings go to: an officer's club, or (admins) everyone.
  const wantedClub = String(form.get("clubId") ?? "");
  const audience = String(form.get("audience") ?? "club");
  let clubId: string | null;
  if (access.isAdmin && audience === "all") clubId = null;
  else {
    const allowed = access.isAdmin ? access.memberClubs : access.officerClubs;
    clubId = allowed.find((c) => c.id === wantedClub)?.id ?? allowed[0]?.id ?? null;
    if (!clubId && !access.isAdmin) return NextResponse.json({ error: "You're not an officer of a club." }, { status: 403 });
  }

  let mergeFirms: Record<string, string> = {};
  try {
    mergeFirms = JSON.parse(String(form.get("mergeFirms") ?? "{}")) as Record<string, string>;
  } catch {
    /* ignore */
  }
  const input = { tabs: await fileToTabs(file), fileName: file.name, clubId, archiveMissing: form.get("archiveMissing") === "true", mergeFirms };
  const plan = await planOpeningsImport(input);
  if (form.get("mode") !== "commit") return NextResponse.json({ preview: plan.preview, clubId });

  if (!plan.creates.length && !plan.updates.length && !plan.archiveIds.length) {
    return NextResponse.json({ batchId: null, counts: plan.preview.counts, message: "Nothing to change — every row matches what's already there." });
  }
  const { batchId } = await commitOpeningsImport(userId, input, plan);

  // Optional announcement in the club feed.
  let posted = false;
  if (form.get("postToClub") === "true" && clubId && plan.creates.length) {
    const n = plan.creates.length;
    const title = `${n} new recruiting opening${n === 1 ? "" : "s"} added`;
    const firms = [...new Set(plan.creates.map((c) => c.firmName))];
    const body = `${firms.slice(0, 6).join(", ")}${firms.length > 6 ? ` and ${firms.length - 6} more` : ""}.\n\n[See the openings](/recruiting/openings)`;
    const input2 = { type: "announcement" as const, title, body, pinned: false, audience: { all: true as const }, delivery: { feed: true, inApp: true, email: false, text: false } };
    const item = await writeItem(clubId, userId, input2);
    await deliver({ clubId, authorId: userId, type: "announcement", title, summary: item.summary, url: "/recruiting/openings", audience: { all: true }, delivery: input2.delivery });
    posted = true;
  }
  return NextResponse.json({ batchId, counts: plan.preview.counts, posted });
}
