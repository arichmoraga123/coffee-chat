import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function requireUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountActive: true },
  });
  if (!u?.accountActive) redirect("/login");
  return userId;
}

export async function getUserIdFromSession() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { accountActive: true },
  });
  if (!u?.accountActive) return null;
  return id;
}

export async function requireAdminUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) redirect("/login");
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountActive: true, role: true },
  });
  if (!u?.accountActive) redirect("/login");
  if (role !== "ADMIN" || u.role !== "ADMIN") redirect("/dashboard");
  return userId;
}

/** Admins and mentors (role "MENTOR") — used for the Prospect Learn mentor tools. Checks the DB role. */
export async function requireMentorUserId(): Promise<{ userId: string; isAdmin: boolean }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountActive: true, role: true },
  });
  if (!u?.accountActive) redirect("/login");
  if (u.role !== "ADMIN" && u.role !== "MENTOR") redirect("/dashboard");
  return { userId, isAdmin: u.role === "ADMIN" };
}
