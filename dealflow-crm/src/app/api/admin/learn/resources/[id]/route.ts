import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { deleteResources } from "@/lib/learn/resource-delete";

/** ADMIN — delete one workbook version. If it was the newest, the previous version becomes the live one. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const n = await deleteResources([id]);
  return n ? NextResponse.json({ deleted: n }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
