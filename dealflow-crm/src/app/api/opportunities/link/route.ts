import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: body.opportunityId, userId },
    select: { id: true },
  });
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, userId },
    select: { id: true },
  });
  if (!opportunity || !contact) {
    return NextResponse.json({ error: "Invalid link target" }, { status: 400 });
  }

  const linked = await prisma.opportunityContact.upsert({
    where: {
      opportunityId_contactId: {
        opportunityId: body.opportunityId,
        contactId: body.contactId,
      },
    },
    update: {},
    create: {
      opportunityId: body.opportunityId,
      contactId: body.contactId,
    },
  });
  return NextResponse.json(linked);
}
