import "server-only";
import { prisma } from "@/lib/prisma";

export type Suspect = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  signupIp: string | null;
  reasons: string[];
  deletedAt: Date | null;
};

/** Looks like random letters: no spaces and very few vowels, or the name is just the email prefix. */
export function randomLookingName(name: string, email: string): boolean {
  const n = name.trim();
  const prefix = email.split("@")[0]?.toLowerCase() ?? "";
  if (!n) return true;
  if (n.toLowerCase() === prefix && /\d/.test(prefix)) return true;
  if (/\s/.test(n)) return false;
  const letters = n.replace(/[^a-z]/gi, "");
  if (letters.length < 6) return false;
  const vowels = (letters.match(/[aeiouy]/gi) ?? []).length;
  const caseFlips = (n.match(/[a-z][A-Z]|[A-Z][a-z][A-Z]/g) ?? []).length;
  return vowels / letters.length < 0.25 || caseFlips >= 3;
}

/** Accounts that are likely bots. Two or more signals, or a burst from one IP, puts an account on the list. */
export async function findSuspects(): Promise<{ suspects: Suspect[]; softDeleted: Suspect[] }> {
  const users = await prisma.user.findMany({
    where: { role: "USER", reviewedKeep: false },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastActiveAt: true,
      signupIp: true,
      eduVerified: true,
      deletedAt: true,
      _count: { select: { clubMemberships: true, questionAttempts: true, lessonProgress: true, contacts: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const byIp = new Map<string, Date[]>();
  for (const u of users) if (u.signupIp) byIp.set(u.signupIp, [...(byIp.get(u.signupIp) ?? []), u.createdAt]);
  const burst = (ip: string | null, at: Date) =>
    Boolean(ip) && (byIp.get(ip!) ?? []).filter((d) => Math.abs(d.getTime() - at.getTime()) <= 3_600_000).length >= 3;

  const suspects: Suspect[] = [];
  const softDeleted: Suspect[] = [];
  for (const u of users) {
    const reasons: string[] = [];
    if (!u.eduVerified && u._count.clubMemberships === 0) reasons.push("Email not verified");
    const noActivity =
      u._count.questionAttempts === 0 &&
      u._count.lessonProgress === 0 &&
      u._count.contacts === 0 &&
      (!u.lastActiveAt || u.lastActiveAt.getTime() - u.createdAt.getTime() < 15 * 60_000);
    if (noActivity) reasons.push("No activity since signup");
    if (randomLookingName(u.name, u.email)) reasons.push("Random-looking name");
    const isBurst = burst(u.signupIp, u.createdAt);
    if (isBurst) reasons.push("3+ signups from this IP within an hour");
    const row = { ...u, reasons };
    if (u.deletedAt) softDeleted.push(row);
    else if (reasons.length >= 2 || isBurst) suspects.push(row);
  }
  return { suspects, softDeleted };
}
