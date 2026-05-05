import { differenceInDays } from "date-fns";
import { InteractionType, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeStringArray, normalizeIntArray } from "@/lib/form-arrays";

export function buildInteractionUncheckedData(
  body: Record<string, unknown>,
  contactId: string,
  userId: string,
) {
  if (body.date == null || String(body.date).trim() === "") {
    throw new Error("date is required");
  }

  const rawType = String(body.type ?? "COFFEE_CHAT").toUpperCase().replace(/-/g, "_");
  const allowedTypes = new Set<string>(Object.values(InteractionType));
  if (!allowedTypes.has(rawType)) {
    throw new Error(`Invalid interaction type: ${rawType}`);
  }
  const interactionType = rawType as InteractionType;

  const interactionDate = new Date(String(body.date));
  const adviceFromNew =
    body.adviceGiven != null && String(body.adviceGiven).trim()
      ? String(body.adviceGiven).trim()
      : null;
  const adviceLegacy =
    body.keyTakeaways != null && String(body.keyTakeaways).trim()
      ? String(body.keyTakeaways).trim()
      : null;
  const adviceGiven = adviceFromNew ?? adviceLegacy ?? null;

  const notesRaw = body.notes;
  const notes =
    notesRaw === undefined || notesRaw === null
      ? null
      : String(notesRaw).trim() === ""
        ? null
        : String(notesRaw).trim();

  const pdRaw = body.personalDetails;
  const personalDetails =
    pdRaw === undefined || pdRaw === null
      ? null
      : String(pdRaw).trim() === ""
        ? null
        : String(pdRaw).trim();

  return {
    contactId,
    userId,
    date: interactionDate,
    type: interactionType,
    notes,
    adviceGiven,
    actionItems: normalizeStringArray(body.actionItems),
    actionItemsChecked: normalizeIntArray(body.actionItemsChecked),
    personalDetails,
    firmInsights:
      body.firmInsights != null && String(body.firmInsights).trim()
        ? String(body.firmInsights).trim()
        : null,
    redFlags:
      body.redFlags != null && String(body.redFlags).trim()
        ? String(body.redFlags).trim()
        : null,
    followUpDate: body.followUpDate ? new Date(String(body.followUpDate)) : null,
  };
}

export async function createInteractionAndSideEffects(opts: {
  userId: string;
  contactId: string;
  body: Record<string, unknown>;
}) {
  const { userId, contactId, body } = opts;
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    select: { id: true },
  });
  if (!contact) return { error: "Contact not found" as const };

  let data: ReturnType<typeof buildInteractionUncheckedData>;
  try {
    data = buildInteractionUncheckedData(body, contactId, userId);
  } catch {
    return { error: "Invalid interaction data" as const };
  }

  const interaction = await prisma.interaction.create({
    data,
  });

  const bonus = differenceInDays(new Date(), data.date) <= 14 ? 2 : 0;
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      relationshipStrength: { increment: 1 + bonus },
      lastInteractionDate: data.date,
    },
  });

  if (body.followUpDate) {
    await prisma.task.create({
      data: {
        contactId,
        userId,
        dueDate: new Date(String(body.followUpDate)),
        taskType: TaskType.FOLLOW_UP,
        notes: "Auto-created from interaction follow-up date",
      },
    });
  }

  return { interaction };
}
