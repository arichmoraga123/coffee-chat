import "server-only";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import type { calendar_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";

function getOAuthEnv(): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const base =
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${base.replace(/\/$/, "")}/api/auth/callback/google`,
  };
}

async function getAuthorizedClient(userId: string): Promise<OAuth2Client | null> {
  const env = getOAuthEnv();
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: "google" },
  });
  if (!integration?.syncEnabled || !integration.refreshToken) return null;

  const oauth2 = new OAuth2Client(env?.clientId, env?.clientSecret, env?.redirectUri);
  oauth2.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  });

  const exp = integration.expiresAt.getTime();
  if (exp < Date.now() + 60_000) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();
      const accessToken = credentials.access_token ?? integration.accessToken;
      const refreshToken = credentials.refresh_token ?? integration.refreshToken;
      const expiry =
        credentials.expiry_date != null
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600_000);
      await prisma.calendarIntegration.update({
        where: { userId_provider: { userId, provider: "google" } },
        data: {
          accessToken,
          refreshToken,
          expiresAt: expiry,
          lastSynced: new Date(),
        },
      });
      oauth2.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch {
      return null;
    }
  }

  return oauth2;
}

export async function getCalendarApi(userId: string) {
  const auth = await getAuthorizedClient(userId);
  if (!auth) return null;
  return google.calendar({ version: "v3", auth });
}

function calendarIdFor(integration: { calendarId: string | null }) {
  return integration.calendarId || "primary";
}

async function upsertExternalEvent(
  userId: string,
  params: {
    existingGoogleId: string | null;
    summary: string;
    description?: string | null;
    start: Date;
    end: Date;
    allDay?: boolean;
  },
): Promise<string | null> {
  const cal = await getCalendarApi(userId);
  if (!cal) return null;
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: "google" },
  });
  if (!integration?.syncEnabled) return null;
  const calId = calendarIdFor(integration);

  const start = params.allDay
    ? { date: params.start.toISOString().slice(0, 10), dateTime: undefined }
    : { dateTime: params.start.toISOString(), timeZone: "UTC" };
  const end = params.allDay
    ? { date: params.end.toISOString().slice(0, 10), dateTime: undefined }
    : { dateTime: params.end.toISOString(), timeZone: "UTC" };

  const body: calendar_v3.Schema$Event = {
    summary: params.summary,
    description: params.description ?? undefined,
    start: start as calendar_v3.Schema$Event["start"],
    end: end as calendar_v3.Schema$Event["end"],
  };

  try {
    if (params.existingGoogleId) {
      const updated = await cal.events.patch({
        calendarId: calId,
        eventId: params.existingGoogleId,
        requestBody: body,
      });
      return updated.data.id ?? params.existingGoogleId;
    }
    const created = await cal.events.insert({
      calendarId: calId,
      requestBody: body,
    });
    return created.data.id ?? null;
  } catch {
    return null;
  }
}

async function deleteExternalEvent(userId: string, googleEventId: string | null) {
  if (!googleEventId) return;
  const cal = await getCalendarApi(userId);
  if (!cal) return;
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: "google" },
  });
  if (!integration?.syncEnabled) return;
  const calId = calendarIdFor(integration);
  try {
    await cal.events.delete({ calendarId: calId, eventId: googleEventId });
  } catch {
    /* ignore */
  }
}

export async function syncRecruitingEventToGoogle(userId: string, eventId: string) {
  const row = await prisma.recruitingEvent.findFirst({
    where: { id: eventId, userId },
  });
  if (!row) return;
  const end = new Date(row.date.getTime() + 60 * 60 * 1000);
  const desc = [row.firmName ? `Firm: ${row.firmName}` : null, row.notes].filter(Boolean).join("\n\n");
  const gid = await upsertExternalEvent(userId, {
    existingGoogleId: row.googleCalendarEventId,
    summary: row.title,
    description: desc || null,
    start: row.date,
    end,
    allDay: false,
  });
  if (gid) {
    await prisma.recruitingEvent.update({
      where: { id: row.id },
      data: { googleCalendarEventId: gid },
    });
  }
}

export async function deleteRecruitingEventGoogle(userId: string, googleEventId: string | null) {
  await deleteExternalEvent(userId, googleEventId);
}

export async function syncCoffeeFollowUpToGoogle(
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
  const gid = await upsertExternalEvent(userId, {
    existingGoogleId: row.googleCalendarEventId,
    summary,
    description: "Follow-up from Prospect coffee chat.",
    start: dayStart,
    end: dayEnd,
    allDay: true,
  });
  if (gid) {
    await prisma.interaction.update({
      where: { id: row.id },
      data: { googleCalendarEventId: gid },
    });
  }
}

export async function syncOpportunityDeadlineToGoogle(userId: string, opportunityId: string) {
  const row = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
    include: { firm: true },
  });
  if (!row) return;
  if (!row.applicationDeadline) {
    await deleteExternalEvent(userId, row.googleCalendarEventId);
    if (row.googleCalendarEventId) {
      await prisma.opportunity.update({
        where: { id: row.id },
        data: { googleCalendarEventId: null },
      });
    }
    return;
  }
  const dayStart = new Date(row.applicationDeadline);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const summary = `${row.firm.name} Application Deadline`;
  const gid = await upsertExternalEvent(userId, {
    existingGoogleId: row.googleCalendarEventId,
    summary,
    description: row.notes || undefined,
    start: dayStart,
    end: dayEnd,
    allDay: true,
  });
  if (gid) {
    await prisma.opportunity.update({
      where: { id: row.id },
      data: { googleCalendarEventId: gid },
    });
  }
}

export async function deleteOpportunityGoogle(userId: string, googleEventId: string | null) {
  await deleteExternalEvent(userId, googleEventId);
}
