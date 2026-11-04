import { prisma } from "@/lib/prisma";
import { syncFollowupTasks } from "@/lib/followup-tasks";
import { loadTasks } from "@/lib/tasks-data";
import { notify } from "@/lib/notify";
import { appUrl, esc, flushOutbound } from "@/lib/outbound";
import { remindStaleMentorQuestions } from "@/lib/mentor-alerts";
import { daysUntil } from "@/lib/openings";
import { finalizeDueDuels } from "@/lib/group-competition";

/** K.5 daily job: follow-up digests, stale mentor questions, today's event reminders, Trash purge, queued texts. */
export async function runDaily(now = new Date()) {
  const out = { users: 0, digests: 0, mentorReminders: 0, eventReminders: 0, openingReminders: 0, purged: 0, sent: 0 };
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

  // 3b. Recruiting openings: "Opens today" and "Deadline in N days" for members who asked to be reminded.
  out.openingReminders = await remindOpenings(todayYmd);

  // 3c. Group duels whose time is up get their final score (pages also do this when opened).
  await finalizeDueDuels(now).catch((e) => console.error("group duels failed", e));

  // 4. Trash keeps contacts for 30 days.
  const purge = await prisma.contact.deleteMany({ where: { deletedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } } });
  out.purged = purge.count;

  // 5. Send everything queued (including texts that waited for quiet hours to end).
  out.sent = (await flushOutbound({ limit: 1000 })).sent;
  return out;
}

/** One notification per member listing the openings that open today or whose deadline is within their reminder window. */
async function remindOpenings(todayYmd: string): Promise<number> {
  const today = new Date(`${todayYmd}T00:00:00Z`);
  const horizon = new Date(today.getTime() + 61 * 86_400_000);
  const due = await prisma.openingReminder.findMany({
    where: {
      opening: { archivedAt: null },
      OR: [
        { remindOpen: true, openSentAt: null, opening: { opensOn: { gte: today, lt: new Date(today.getTime() + 86_400_000) } } },
        { deadlineSentAt: null, opening: { deadline: { gte: today, lte: horizon } } },
      ],
    },
    include: { opening: { select: { id: true, firmName: true, program: true, opensOn: true, deadline: true, link: true } } },
  });
  const byUser = new Map<string, { opens: typeof due; deadlines: typeof due }>();
  for (const r of due) {
    const o = r.opening;
    const g = byUser.get(r.userId) ?? { opens: [], deadlines: [] };
    if (r.remindOpen && !r.openSentAt && o.opensOn && o.opensOn.toISOString().slice(0, 10) === todayYmd) g.opens.push(r);
    else if (!r.deadlineSentAt && o.deadline && daysUntil(o.deadline, todayYmd) <= r.remindDaysBefore) g.deadlines.push(r);
    else continue;
    byUser.set(r.userId, g);
  }
  let sent = 0;
  const now = new Date();
  for (const [userId, g] of byUser) {
    const lines = [
      ...g.opens.map((r) => ({ text: `Opens today: ${r.opening.firmName} — ${r.opening.program}`, link: r.opening.link })),
      ...g.deadlines.map((r) => {
        const d = daysUntil(r.opening.deadline!, todayYmd);
        return { text: `Deadline ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}: ${r.opening.firmName} — ${r.opening.program}`, link: r.opening.link };
      }),
    ];
    const title = g.opens.length && !g.deadlines.length ? `${g.opens.length} application${g.opens.length === 1 ? "" : "s"} open today` : `${lines.length} application deadline${lines.length === 1 ? "" : "s"} coming up`;
    await notify(
      userId,
      "opening_reminder",
      {
        title,
        body: lines.map((l) => l.text).slice(0, 3).join(" · "),
        url: "/recruiting/openings",
        email: {
          subject: title,
          intro: "Openings you asked to be reminded about.",
          lines: lines.slice(0, 20).map((l) => `${esc(l.text)}${l.link ? ` · <a href="${esc(l.link)}" style="color:#18453b;font-weight:600">Apply</a>` : ""}`),
          cta: "Open Openings",
        },
        sms: `Prospect: ${lines[0].text}${lines.length > 1 ? ` (+${lines.length - 1} more)` : ""}. ${appUrl("/recruiting/openings").replace(/^https?:\/\//, "")}`,
      },
      { flush: false },
    ).catch((e) => console.error("opening reminder failed", userId, e));
    await prisma.openingReminder.updateMany({ where: { userId, openingId: { in: g.opens.map((r) => r.openingId) } }, data: { openSentAt: now } });
    await prisma.openingReminder.updateMany({ where: { userId, openingId: { in: g.deadlines.map((r) => r.openingId) } }, data: { deadlineSentAt: now } });
    sent++;
  }
  return sent;
}
