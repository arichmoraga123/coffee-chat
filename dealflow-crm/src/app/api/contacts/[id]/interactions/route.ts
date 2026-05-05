import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { createInteractionAndSideEffects } from "@/lib/create-interaction";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contactId } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const result = await createInteractionAndSideEffects({ userId, contactId, body });
  if ("error" in result) {
    const status = result.error === "Contact not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result.interaction);
}
