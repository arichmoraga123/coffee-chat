import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { commitImport, planImport } from "@/lib/rolodex-import";
import { syncFollowupTasks } from "@/lib/followup-tasks";

export const maxDuration = 120;

const schema = z.object({
  commit: z.boolean().optional(),
  source: z.enum(["rolodex_template", "linkedin", "csv"]),
  fileName: z.string().max(300),
  tabs: z
    .array(z.object({ name: z.string().max(200), rows: z.array(z.array(z.string().max(20_000))).max(50_000) }))
    .min(1)
    .max(10),
  acceptSuggestions: z.boolean().optional(),
  acceptFirms: z.array(z.string()).max(2000).optional(),
});

/** Preview (default) or commit a Rolodex / LinkedIn / CSV import. The client sends parsed sheet rows. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That file couldn't be read." }, { status: 400 });
  const { commit, ...input } = parsed.data;
  const plan = await planImport(userId, input);
  if (!commit) return NextResponse.json({ preview: plan.preview });
  const c = plan.preview.counts;
  if (!c.contactsNew && !c.contactsUpdated && !c.interactions) return NextResponse.json({ error: "Nothing to import." }, { status: 400 });
  const { batchId, touched } = await commitImport(userId, input, plan);
  await syncFollowupTasks(userId, touched);
  return NextResponse.json({ batchId, counts: c });
}
