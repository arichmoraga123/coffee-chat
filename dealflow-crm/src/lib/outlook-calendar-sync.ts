import "server-only";
import { prisma } from "@/lib/prisma";

const GRAPH = "https://graph.microsoft.com/v1.0";

function msTenant(): string {
  return process.env.MICROSOFT_TENANT_ID?.trim() || "common";
}

function msClient(): { id: string; secret: string } | null {
  const id = process.env.MICROSOFT_CLIENT_ID?.trim();
  const secret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

function graphDateTime(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "");
}

type GraphEventPayload = {
  subject: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
};

async function refreshOutlookAccessToken(userId: string): Promise<string | null> {
  const creds = msClient();
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: "outlook" },
  });
  if (!creds || !integration?.refreshToken || !integration.syncEnabled) return null;

  const params = new URLSearchParams({
    client_id: creds.id,
    client_secret: creds.secret,
    grant_type: "refresh_token",
    refresh_token: integration.refreshToken,
    scope: "offline_access Calendars.ReadWrite openid profile email",
  });

  const res = await fetch(`https://login.microsoftonline.com/${msTenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  const accessToken = data.access_token;
  if (!accessToken) return null;
  const refreshToken = data.refresh_token ?? integration.refreshToken;
  const expiresIn = data.expires_in ?? 3600;

  await prisma.calendarIntegration.update({
    where: { userId_provider: { userId, provider: "outlook" } },
    data: {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      lastSynced: new Date(),
    },
  });

  return accessToken;
}

async function getOutlookAccessToken(userId: string): Promise<string | null> {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: "outlook" },
  });
  if (!integration?.syncEnabled || !integration.accessToken) return null;

  if (integration.expiresAt.getTime() < Date.now() + 60_000) {
    return refreshOutlookAccessToken(userId);
  }
  return integration.accessToken;
}

async function graphJson<T>(userId: string, path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; status: number }> {
  let token = await getOutlookAccessToken(userId);
  if (!token) return { ok: false, status: 401 };

  const doFetch = async (t: string) =>
    fetch(`${GRAPH}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    token = await refreshOutlookAccessToken(userId);
    if (!token) return { ok: false, status: 401 };
    res = await doFetch(token);
  }

  if (res.status === 204) return { ok: true, status: 204 };
  const text = await res.text();
  let data: T | undefined;
  try {
    data = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    data = undefined;
  }
  return { ok: res.ok, data, status: res.status };
}

async function upsertGraphEvent(
  userId: string,
  params: {
    existingId: string | null;
    summary: string;
    description?: string | null;
    start: Date;
    end: Date;
    allDay: boolean;
  },
): Promise<string | null> {
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: "outlook" },
  });
  if (!integration?.syncEnabled) return null;

  const body: GraphEventPayload = {
    subject: params.summary,
    isAllDay: params.allDay,
    start: { dateTime: graphDateTime(params.start), timeZone: "UTC" },
    end: { dateTime: graphDateTime(params.end), timeZone: "UTC" },
  };
  if (params.description) {
    body.body = { contentType: "text", content: params.description };
  }

  if (params.existingId) {
    const patch = await graphJson<{ id?: string }>(userId, `/me/events/${encodeURIComponent(params.existingId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (patch.ok) return params.existingId;
    return null;
  }

  const created = await graphJson<{ id?: string }>(userId, "/me/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!created.ok || !created.data?.id) return null;
  return created.data.id;
}

async function deleteGraphEvent(userId: string, eventId: string | null) {
  if (!eventId) return;
  await graphJson(userId, `/me/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}

export async function syncRecruitingEventToOutlook(userId: string, eventId: string) {
  const row = await prisma.recruitingEvent.findFirst({
    where: { id: eventId, userId },
  });
  if (!row) return;
  const end = new Date(row.date.getTime() + 60 * 60 * 1000);
  const desc = [row.firmName ? `Firm: ${row.firmName}` : null, row.notes].filter(Boolean).join("\n\n");
  const oid = await upsertGraphEvent(userId, {
    existingId: row.outlookCalendarEventId,
    summary: row.title,
    description: desc || null,
    start: row.date,
    end,
    allDay: false,
  });
  if (oid) {
    await prisma.recruitingEvent.update({
      where: { id: row.id },
      data: { outlookCalendarEventId: oid },
    });
  }
}

export async function deleteRecruitingEventOutlook(userId: string, outlookEventId: string | null) {
  await deleteGraphEvent(userId, outlookEventId);
}

export async function syncCoffeeFollowUpToOutlook(
  userId: string,
  interactionId: string,
  contactName: string,
  followUpDate: Date,
) {
  const row = await prisma.interaction.findFirst({
    where: { id: interactionId, userId },
  });
  if (!row || !followUpDate) return;
  const dayStart = new Date(followUpDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const summary = `${contactName} — Coffee Chat Follow-up`;
  const oid = await upsertGraphEvent(userId, {
    existingId: row.outlookCalendarEventId,
    summary,
    description: "Follow-up from DealFlow CRM coffee chat.",
    start: dayStart,
    end: dayEnd,
    allDay: true,
  });
  if (oid) {
    await prisma.interaction.update({
      where: { id: row.id },
      data: { outlookCalendarEventId: oid },
    });
  }
}

export async function syncOpportunityDeadlineToOutlook(userId: string, opportunityId: string) {
  const row = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
    include: { firm: true },
  });
  if (!row) return;
  if (!row.applicationDeadline) {
    await deleteGraphEvent(userId, row.outlookCalendarEventId);
    if (row.outlookCalendarEventId) {
      await prisma.opportunity.update({
        where: { id: row.id },
        data: { outlookCalendarEventId: null },
      });
    }
    return;
  }
  const dayStart = new Date(row.applicationDeadline);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const summary = `${row.firm.name} Application Deadline`;
  const oid = await upsertGraphEvent(userId, {
    existingId: row.outlookCalendarEventId,
    summary,
    description: row.notes || undefined,
    start: dayStart,
    end: dayEnd,
    allDay: true,
  });
  if (oid) {
    await prisma.opportunity.update({
      where: { id: row.id },
      data: { outlookCalendarEventId: oid },
    });
  }
}

export async function deleteOpportunityOutlook(userId: string, outlookEventId: string | null) {
  await deleteGraphEvent(userId, outlookEventId);
}
