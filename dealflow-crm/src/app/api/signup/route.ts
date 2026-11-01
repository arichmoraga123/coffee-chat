import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { randomReferralCode } from "@/lib/referral-code";

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim() || null;
}

/** Cloudflare Turnstile check. Skipped when TURNSTILE_SECRET_KEY isn't set (e.g. local dev). */
async function turnstileOk(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const d = (await r.json()) as { success?: boolean };
    return Boolean(d.success);
  } catch {
    return false;
  }
}

const SIGNUPS_PER_IP_PER_HOUR = 3;

export async function POST(req: Request) {
  const body = await req.json();
  const ip = clientIp(req);
  if (ip) {
    const recent = await prisma.user.count({ where: { signupIp: ip, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
    if (recent >= SIGNUPS_PER_IP_PER_HOUR) {
      return NextResponse.json({ error: "Too many signups from this network. Try again in an hour." }, { status: 429 });
    }
  }
  if (!(await turnstileOk(typeof body.turnstileToken === "string" ? body.turnstileToken : undefined, ip))) {
    return NextResponse.json({ error: "Please complete the human check." }, { status: 400 });
  }
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
    data: { name, email, passwordHash, referralCode, signupIp: ip },
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
