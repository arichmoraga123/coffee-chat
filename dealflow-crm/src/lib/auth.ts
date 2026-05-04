import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function requireUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  return userId;
}

export async function getUserIdFromSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
