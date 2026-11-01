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

  const due = new Date(String(body.dueDate ?? ""));
  if (isNaN(due.getTime())) return NextResponse.json({ error: "Pick a due date." }, { status: 400 });
  const taskType = (Object.values(TaskType) as string[]).includes(body.taskType) ? (body.taskType as TaskType) : TaskType.FOLLOW_UP;
  const notes = String(body.notes ?? "").trim().slice(0, 2000);
  const task = await prisma.task.create({
    data: { contactId: contact.id, userId, dueDate: due, taskType, notes, kind: "manual", reason: notes ? notes.split("\n")[0].slice(0, 200) : null },
  });
  return NextResponse.json(task);
}
