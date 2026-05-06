import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

function originFromRequest(req: Request) {
  const u = new URL(req.url);
  const fwd = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  if (fwd) return `${proto}://${fwd}`;
  return u.origin;
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { eduEmail?: string; skip?: boolean };
  if (body.skip === true) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const raw = String(body.eduEmail ?? "").trim().toLowerCase();
  if (!raw || !raw.includes("@")) {
    return NextResponse.json({ error: "Enter a valid school email address." }, { status: 400 });
  }

  const at = raw.indexOf("@");
  const domain = raw.slice(at + 1).toLowerCase();
  const school = await prisma.school.findUnique({ where: { domain } });

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      eduEmail: raw,
      schoolId: school ? school.id : null,
      eduVerified: false,
      eduVerificationToken: token,
      eduVerificationExpires: expires,
    },
  });

  const origin = originFromRequest(req);
  const verifyUrl = `${origin}/api/user/verify-edu?token=${encodeURIComponent(token)}`;

  const resendKey = process.env.RESEND_API_KEY;
  let emailSent = false;
  if (resendKey) {
    const from = process.env.RESEND_FROM ?? "Prospect <onboarding@resend.dev>";
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [raw],
        subject: "Verify your school email — Prospect",
        html: `<p>Thanks for joining Prospect.</p><p><a href="${verifyUrl}">Click here to verify your school email</a>.</p><p>If you did not request this, you can ignore this message.</p>`,
      }),
    });
    emailSent = r.ok;
  }

  return NextResponse.json({
    ok: true,
    schoolFound: Boolean(school),
    schoolName: school?.name ?? null,
    emailSent,
    verifyUrl: emailSent ? undefined : verifyUrl,
  });
}
