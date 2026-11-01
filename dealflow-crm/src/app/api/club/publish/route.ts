import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";
import { canPost, deliver, parseAudience } from "@/lib/club-publish";
import { publishSchema } from "@/lib/club-publish-schema";
import { writeItem } from "@/lib/club-publish-write";

export const maxDuration = 60;

/** Post to club (admins and officers): resource, assignment, reading, case study, project, event, or announcement. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId || !(await canPost(userId, clubId))) return NextResponse.json({ error: "Only officers and admins can post." }, { status: 403 });
  const parsed = publishSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue ? `${issue.path.join(".") || "Form"}: ${issue.message}` : "Check the form." }, { status: 400 });
  }
  const input = parsed.data;
  const item = await writeItem(clubId, userId, input);
  const recipients = await deliver({ clubId, authorId: userId, type: input.type, title: input.title, summary: item.summary, url: item.url, audience: parseAudience(input.audience), delivery: input.delivery });
  return NextResponse.json({ ...item, recipients }, { status: 201 });
}
