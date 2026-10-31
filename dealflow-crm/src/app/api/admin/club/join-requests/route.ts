import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { upsertRoster } from "@/lib/club-roster";

const Body = z.object({ id: z.string().min(1), decision: z.enum(["approve", "deny"]) });

/** Approving adds the student's verified .edu email to the roster, which creates their membership. */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { id, decision } = parsed.data;

  const request = await prisma.clubJoinRequest.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true, eduEmail: true, eduVerified: true } } },
  });
  if (!request || request.status !== "pending") return NextResponse.json({ error: "Request not found" }, { status: 404 });

  if (decision === "approve") {
    const email = (request.user.eduVerified && request.user.eduEmail ? request.user.eduEmail : request.user.email).toLowerCase();
    await upsertRoster(request.clubId, [{ email, name: request.user.name, role: "member" }]);
  }
  await prisma.clubJoinRequest.update({
    where: { id },
    data: { status: decision === "approve" ? "approved" : "denied", decidedAt: new Date(), decidedBy: auth.userId },
  });
  return NextResponse.json({ ok: true });
}
