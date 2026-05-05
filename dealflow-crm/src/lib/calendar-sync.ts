import "server-only";
import {
  deleteRecruitingEventGoogle,
  syncCoffeeFollowUpToGoogle,
  syncOpportunityDeadlineToGoogle,
  syncRecruitingEventToGoogle,
} from "@/lib/google-calendar-sync";
import {
  deleteRecruitingEventOutlook,
  syncCoffeeFollowUpToOutlook,
  syncOpportunityDeadlineToOutlook,
  syncRecruitingEventToOutlook,
} from "@/lib/outlook-calendar-sync";

/** Sync recruiting events to every connected calendar (Google + Outlook). */
export async function syncRecruitingEventToExternalCalendars(userId: string, eventId: string) {
  await Promise.all([syncRecruitingEventToGoogle(userId, eventId), syncRecruitingEventToOutlook(userId, eventId)]);
}

export async function deleteRecruitingEventFromExternalCalendars(
  userId: string,
  googleEventId: string | null,
  outlookEventId: string | null,
) {
  await Promise.all([
    deleteRecruitingEventGoogle(userId, googleEventId),
    deleteRecruitingEventOutlook(userId, outlookEventId),
  ]);
}

export async function syncCoffeeFollowUpToExternalCalendars(
  userId: string,
  interactionId: string,
  contactName: string,
  followUpDate: Date,
) {
  await Promise.all([
    syncCoffeeFollowUpToGoogle(userId, interactionId, contactName, followUpDate),
    syncCoffeeFollowUpToOutlook(userId, interactionId, contactName, followUpDate),
  ]);
}

export async function syncOpportunityDeadlineToExternalCalendars(userId: string, opportunityId: string) {
  await Promise.all([
    syncOpportunityDeadlineToGoogle(userId, opportunityId),
    syncOpportunityDeadlineToOutlook(userId, opportunityId),
  ]);
}
