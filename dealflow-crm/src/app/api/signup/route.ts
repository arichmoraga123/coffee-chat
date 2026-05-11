import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { randomReferralCode } from "@/lib/referral-code";

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const referredByCode = String(body.refCode ?? "").trim().toUpperCase();

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email, and password (8+ chars) are required." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  let referralCode = randomReferralCode();
  for (let i = 0; i < 40; i++) {
    const clash = await prisma.user.findFirst({ where: { referralCode } });
    if (!clash) break;
    referralCode = randomReferralCode();
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash, referralCode },
    select: { id: true, name: true, email: true },
  });

  if (referredByCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referredByCode },
      select: { id: true },
    });
    if (referrer && referrer.id !== user.id) {
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId: user.id,
          code: `${referredByCode}-${user.id.slice(-8)}`,
          status: "pending",
        },
      });
    }
  }

  return NextResponse.json(user, { status: 201 });
}
