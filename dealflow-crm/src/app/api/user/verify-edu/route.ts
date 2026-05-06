import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const base = new URL(req.url);

  const fail = (code: string) => NextResponse.redirect(new URL(`/profile?eduError=${code}`, base));

  if (!token) return fail("missing");

  const user = await prisma.user.findFirst({
    where: {
      eduVerificationToken: token,
      eduVerificationExpires: { gt: new Date() },
    },
  });
  if (!user) return fail("invalid");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      eduVerified: true,
      eduVerificationToken: null,
      eduVerificationExpires: null,
    },
  });

  return NextResponse.redirect(new URL("/profile?eduVerified=1", base));
}
