import { differenceInDays } from "date-fns";
import { InteractionType, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncCoffeeFollowUpToExternalCalendars } from "@/lib/calendar-sync";
import { normalizeStringArray, normalizeIntArray } from "@/lib/form-arrays";
import { INTERACTION_KINDS, kindOf, stageFromKind, type InteractionKind } from "@/lib/followups";
import { syncFollowupTasks } from "@/lib/followup-tasks";

export function buildInteractionUncheckedData(
  body: Record<string, unknown>,
  contactId: string,
  userId: string,
) {
  if (body.date == null || String(body.date).trim() === "") {
    throw new Error("date is required");
  }

  // New fine-grained kinds map onto the older enum so existing views keep working.
  const kind = typeof body.kind === "string" && body.kind in INTERACTION_KINDS ? (body.kind as InteractionKind) : null;
  const rawType = kind ? INTERACTION_KINDS[kind].legacy : String(body.type ?? "COFFEE_CHAT").toUpperCase().replace(/-/g, "_");
  const allowedTypes = new Set<string>(Object.values(InteractionType));
  if (!allowedTypes.has(rawType)) {
    throw new Error(`Invalid interaction type: ${rawType}`);
  }
  const interactionType = rawType as InteractionType;

  const interactionDate = new Date(String(body.date));
  if (isNaN(interactionDate.getTime())) throw new Error("date is invalid");
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
    kind: kind ?? kindOf({ type: interactionType, notes }),
    nextStep: body.nextStep != null && String(body.nextStep).trim() ? String(body.nextStep).trim() : null,
    nextStepDue: body.nextStepDue ? new Date(String(body.nextStepDue)) : null,
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

  if (
    interaction.type === "COFFEE_CHAT" &&
    data.followUpDate &&
    interaction.followUpDate
  ) {
    const contactForName = await prisma.contact.findFirst({
      where: { id: contactId, userId },
      select: { fullName: true },
    });
    if (contactForName) {
      void syncCoffeeFollowUpToExternalCalendars(
        userId,
        interaction.id,
        contactForName.fullName,
        interaction.followUpDate,
      );
    }
  }

  const bonus = differenceInDays(new Date(), data.date) <= 14 ? 2 : 0;
  const current = await prisma.contact.findUnique({ where: { id: contactId }, select: { lastInteractionDate: true, list: true } });
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      relationshipStrength: { increment: 1 + bonus },
      // Logging an older interaction never moves "last contacted" backwards.
      lastInteractionDate: !current?.lastInteractionDate || current.lastInteractionDate < data.date ? data.date : current.lastInteractionDate,
      relationshipStage: stageFromKind(data.kind as InteractionKind),
      // Talking to someone on the Network list makes them an active contact.
      ...(current?.list === "network" ? { list: "active" } : {}),
    },
  });
  await syncFollowupTasks(userId, [contactId]).catch((e) => console.error("followup sync failed", e));

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
