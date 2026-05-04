import { NextResponse } from "next/server";
import { TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, userId },
    select: { id: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      contactId: body.contactId,
      userId,
      dueDate: new Date(body.dueDate),
      taskType: body.taskType as TaskType,
      notes: body.notes || "",
    },
  });
  return NextResponse.json(task);
}
