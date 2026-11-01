import { prisma } from "@/lib/prisma";
import { syncFollowupTasks } from "@/lib/followup-tasks";
import { loadTasks } from "@/lib/tasks-data";
import { notify } from "@/lib/notify";
import { appUrl, esc, flushOutbound } from "@/lib/outbound";
import { remindStaleMentorQuestions } from "@/lib/mentor-alerts";

/** K.5 daily job: follow-up digests, stale mentor questions, today's event reminders, Trash purge, queued texts. */
export async function runDaily(now = new Date()) {
  const out = { users: 0, digests: 0, mentorReminders: 0, eventReminders: 0, purged: 0, sent: 0 };
  const todayYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const tomorrow = new Date(`${todayYmd}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // 1. Follow-up digests.
  const users = await prisma.user.findMany({ where: { accountActive: true, contacts: { some: { deletedAt: null } } }, select: { id: true } });
  for (const u of users) {
    out.users++;
    await syncFollowupTasks(u.id).catch((e) => console.error("sync failed", u.id, e));
    const already = await prisma.notification.count({ where: { userId: u.id, kind: "followup_digest", createdAt: { gte: new Date(now.getTime() - 20 * 3_600_000) } } });
    if (already) continue;
    const due = await loadTasks(u.id, { dueBefore: tomorrow, take: 50 });
    if (!due.length) continue;
    const overdue = due.filter((t) => t.due < todayYmd).length;
    const title = overdue === due.length ? `${due.length} overdue follow-up${due.length === 1 ? "" : "s"}` : overdue ? `${due.length} follow-ups due (${overdue} overdue)` : `${due.length} follow-up${due.length === 1 ? "" : "s"} due today`;
    const names = [...new Set(due.map((t) => t.contactName))];
    const who = names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
    const host = appUrl("/tasks").replace(/^https?:\/\//, "");
    await notify(
      u.id,
      "followup_digest",
      {
        title,
        body: who,
        url: "/tasks",
        email: {
          subject: `${title} — ${who}`,
          intro: "Here's who to get back to today.",
          lines: due.slice(0, 20).map((t) => {
            const late = t.due < todayYmd;
            const draft = t.draft ? ` · <a href="${esc(appUrl(`/emails?contact=${t.contactId}&kind=${t.draft}`))}" style="color:#18453b;font-weight:600">Draft email</a>` : "";
            return `<b>${esc(t.title)}</b> · ${esc(t.contactName)}, ${esc(t.firmName)}<br><span style="color:${late ? "#9a5b00" : "#4a504c"}">${late ? "Overdue" : "Due today"}${t.detail ? ` · ${esc(t.detail)}` : ""}</span>${draft}`;
          }),
          cta: "Open Tasks",
        },
        sms: `Prospect: ${title} — ${who}. ${host}`,
      },
      { flush: false },
    );
    out.digests++;
  }

  // 2. Mentor questions unanswered for 24 hours.
  out.mentorReminders = await remindStaleMentorQuestions();

  // 3. Day-of event reminders for people who RSVP'd.
  // Midnight Eastern, whether it's EDT (UTC-4) or EST (UTC-5).
  const etHour = (d: Date) => Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/New_York" }).format(d));
  const dayStart = [4, 5].map((h) => new Date(`${todayYmd}T0${h}:00:00Z`)).find((d) => etHour(d) === 0) ?? new Date(`${todayYmd}T05:00:00Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
  const events = await prisma.clubEvent.findMany({ where: { date: { gte: dayStart, lt: dayEnd }, reminderSentAt: null, archivedAt: null } });
  for (const e of events) {
    const time = e.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    for (const id of e.rsvpIds) {
      const pref = await prisma.notificationPref.findUnique({ where: { userId: id }, select: { eventReminders: true } });
      if (pref && !pref.eventReminders) continue;
      await notify(
        id,
        "event_reminder",
        {
          title: `Today: ${e.title} at ${time}`,
          body: [e.location, e.meetingLink ? "Link in the event" : null].filter(Boolean).join(" · ") || "See the event for details.",
          url: `/club/events#${e.id}`,
          email: { subject: `Today: ${e.title} at ${time}`, intro: e.description?.slice(0, 400) ?? undefined, cta: "View event" },
          sms: `Prospect: ${e.title} today at ${time}${e.location ? `, ${e.location}` : ""}.`,
        },
        { flush: false },
      );
      out.eventReminders++;
    }
    await prisma.clubEvent.update({ where: { id: e.id }, data: { reminderSentAt: now } });
  }

  // 4. Trash keeps contacts for 30 days.
  const purge = await prisma.contact.deleteMany({ where: { deletedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } } });
  out.purged = purge.count;

  // 5. Send everything queued (including texts that waited for quiet hours to end).
  out.sent = (await flushOutbound({ limit: 1000 })).sent;
  return out;
}
