import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL, type PrefCategory } from "@/lib/notification-kinds";
import { appUrl, esc } from "@/lib/outbound";

/** Email unsubscribe link (one category). Works without signing in; GET shows a page, POST is one-click. */
async function handle(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("t") ?? "";
  const c = u.searchParams.get("c") ?? "";
  if (!(c in CATEGORY_LABEL) || !token) return null;
  const r = await prisma.notificationPref.updateMany({ where: { unsubscribeToken: token }, data: { [c as PrefCategory]: false } });
  return r.count ? CATEGORY_LABEL[c as PrefCategory] : null;
}

export async function GET(req: Request) {
  const label = await handle(req);
  const msg = label ? `You won't get ${esc(label.toLowerCase())} emails anymore.` : "That unsubscribe link isn't valid anymore.";
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prospect</title></head><body style="font-family:Inter,-apple-system,Segoe UI,Arial,sans-serif;background:#f6f5f2;color:#1c1f1d;padding:48px 16px"><div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e7e5e0;border-radius:10px;padding:24px"><h1 style="font-size:18px;margin:0 0 8px">${label ? "Unsubscribed" : "Link expired"}</h1><p style="font-size:14px;color:#4a504c;margin:0 0 16px">${msg} You can change any notification setting in Prospect.</p><a href="${esc(appUrl("/profile#notifications"))}" style="color:#18453b;font-weight:600;font-size:14px">Notification settings</a></div></body></html>`;
  return new NextResponse(html, { status: label ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: Request) {
  const label = await handle(req);
  return NextResponse.json({ ok: Boolean(label) }, { status: label ? 200 : 400 });
}
