import { prisma } from "@/lib/prisma";

export const PROJECT_STATUS: Record<string, string> = { planning: "Planning", active: "In progress", done: "Done" };

/** Team names for a set of projects in one query. */
export async function teamNames(projects: { memberIds: string[]; leadId: string | null }[]) {
  const ids = [...new Set(projects.flatMap((p) => [...p.memberIds, ...(p.leadId ? [p.leadId] : [])]))];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}
