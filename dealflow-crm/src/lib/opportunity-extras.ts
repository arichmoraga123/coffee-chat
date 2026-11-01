import "server-only";
import { prisma } from "@/lib/prisma";
import { OPPORTUNITY_ROLE_VALUES } from "@/lib/constants";

/** Group / location / linked contacts / custom roles, shared by opportunity create and edit. */
export async function applyOpportunityExtras(userId: string, opportunityId: string, body: Record<string, unknown>) {
  const data: { group?: string | null; location?: string | null } = {};
  if (body.group !== undefined) data.group = String(body.group ?? "").trim() || null;
  if (body.location !== undefined) data.location = String(body.location ?? "").trim() || null;
  if (Object.keys(data).length) await prisma.opportunity.update({ where: { id: opportunityId }, data });

  if (Array.isArray(body.contactIds)) {
    const ids = (body.contactIds as unknown[]).map(String).slice(0, 20);
    const owned = await prisma.contact.findMany({ where: { id: { in: ids }, userId }, select: { id: true } });
    await prisma.$transaction([
      prisma.opportunityContact.deleteMany({ where: { opportunityId } }),
      prisma.opportunityContact.createMany({ data: owned.map((c) => ({ opportunityId, contactId: c.id })), skipDuplicates: true }),
    ]);
  }

  // Remember roles the student typed in themselves.
  const role = typeof body.role === "string" ? body.role.trim() : "";
  if (role && !(OPPORTUNITY_ROLE_VALUES as readonly string[]).includes(role)) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { customRoles: true } });
    if (u && !u.customRoles.includes(role)) await prisma.user.update({ where: { id: userId }, data: { customRoles: { push: role } } });
  }
}
