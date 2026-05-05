import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

type Row = {
  provider: string;
  syncEnabled: boolean;
  lastSynced: Date | null;
  expiresAt: Date;
  calendarId: string | null;
};

function toStatus(row: Row | null) {
  if (!row) {
    return {
      connected: false,
      syncEnabled: false,
      lastSynced: null as string | null,
      expiresAt: null as string | null,
      calendarId: null as string | null,
    };
  }
  return {
    connected: true,
    syncEnabled: row.syncEnabled,
    lastSynced: row.lastSynced?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
    calendarId: row.calendarId,
  };
}

/** GET status for Google + Outlook · DELETE ?provider=google|outlook disconnects one integration. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.calendarIntegration.findMany({
    where: { userId },
    select: {
      provider: true,
      syncEnabled: true,
      lastSynced: true,
      expiresAt: true,
      calendarId: true,
    },
  });

  const google = rows.find((r) => r.provider === "google") ?? null;
  const outlook = rows.find((r) => r.provider === "outlook") ?? null;

  return NextResponse.json({
    google: toStatus(google),
    outlook: toStatus(outlook),
  });
}

export async function DELETE(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  if (provider !== "google" && provider !== "outlook") {
    return NextResponse.json({ error: "provider=google|outlook required" }, { status: 400 });
  }

  await prisma.calendarIntegration.deleteMany({ where: { userId, provider } });
  return NextResponse.json({ ok: true });
}
