import { NextResponse } from "next/server";
import { differenceInDays } from "date-fns";
import { InteractionType, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const interactionDate = new Date(body.date);
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, userId },
    select: { id: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const interaction = await prisma.interaction.create({
    data: {
      contactId: body.contactId,
      userId,
      date: interactionDate,
      type: body.type as InteractionType,
      notes: body.notes || "",
      keyTakeaways: body.keyTakeaways || "",
      personalDetails: body.personalDetails || "",
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
    },
  });

  const bonus = differenceInDays(new Date(), interactionDate) <= 14 ? 2 : 0;
  await prisma.contact.update({
    where: { id: body.contactId },
    data: {
      relationshipStrength: { increment: 1 + bonus },
      lastInteractionDate: interactionDate,
    },
  });

  if (body.followUpDate) {
    await prisma.task.create({
      data: {
        contactId: body.contactId,
        userId,
        dueDate: new Date(body.followUpDate),
        taskType: TaskType.FOLLOW_UP,
        notes: "Auto-created from interaction follow-up date",
      },
    });
  }

  return NextResponse.json(interaction);
}
