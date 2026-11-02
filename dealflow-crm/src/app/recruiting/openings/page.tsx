import { requireUserId } from "@/lib/auth";
import { loadOpenings, openingsAccess } from "@/lib/openings-data";
import { OpeningsView } from "@/components/openings/openings-view";
import { levelFromGradYear, targetFromTrack } from "@/lib/resume/rubric";
import { OPENING_TRACKS } from "@/lib/openings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Openings" };

export default async function OpeningsPage({ searchParams }: { searchParams: Promise<{ track?: string; q?: string }> }) {
  const sp = await searchParams;
  const userId = await requireUserId();
  const access = await openingsAccess(userId);
  const rows = await loadOpenings(userId, { includeArchived: access.canEdit });
  const level = levelFromGradYear(access.user?.classYear) ?? null;
  const target = targetFromTrack(access.user?.careerTracks?.[0]);
  const track = (OPENING_TRACKS as readonly string[]).includes(target) ? target : null;
  const linkTrack = sp.track && (OPENING_TRACKS as readonly string[]).includes(sp.track) ? sp.track : null;
  return <OpeningsView rows={rows} canEdit={access.canEdit} defaults={{ classYear: level, track: linkTrack ?? track, q: (sp.q ?? "").slice(0, 80) }} />;
}
