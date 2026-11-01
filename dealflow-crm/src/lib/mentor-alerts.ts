import { prisma } from "@/lib/prisma";
import { getLesson } from "@/lib/learn/lessons";
import { notify, notifyMany } from "@/lib/notify";
import { esc } from "@/lib/outbound";

/** "5.2 CAPM & beta" from a lesson id like "5-2-capm-and-beta". */
export function lessonLabel(lessonId: string) {
  const l = getLesson(lessonId);
  const num = lessonId.split("-").slice(0, 2).join(".");
  return l ? `${/^\d+\.\d+$/.test(num) ? `${num} ` : ""}${l.title}` : lessonId;
}

/** "Jordan K." */
export function shortName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A student";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

const staff = async () => (await prisma.user.findMany({ where: { role: { in: ["ADMIN", "MENTOR"] }, accountActive: true }, select: { id: true } })).map((u) => u.id);

/** K.6 — a student asked a mentor: tell every admin and mentor right away. */
export async function alertNewMentorQuestion(q: { id: string; lessonId: string; question: string; userId: string }) {
  const asker = await prisma.user.findUnique({ where: { id: q.userId }, select: { name: true } });
  const snippet = q.question.length > 90 ? `${q.question.slice(0, 90).trim()}…` : q.question;
  const title = `New question on ${lessonLabel(q.lessonId)} from ${shortName(asker?.name)}`;
  const url = `/admin/learn/questions?q=${q.id}`;
  const ids = (await staff()).filter((id) => id !== q.userId);
  await notifyMany(ids, "mentor_question", {
    title,
    body: `"${snippet}"`,
    url,
    email: { subject: title, intro: `"${q.question.slice(0, 600)}"`, cta: "Answer it" },
    sms: `Prospect: ${title}: "${snippet.slice(0, 70)}"`,
  });
}

/** K.6 — once, for questions still open after 24 hours. */
export async function remindStaleMentorQuestions() {
  const stale = await prisma.mentorQuestion.findMany({
    where: { status: "open", remindedAt: null, createdAt: { lt: new Date(Date.now() - 24 * 3_600_000) } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });
  if (!stale.length) return 0;
  const ids = await staff();
  const title = `${stale.length} mentor ${stale.length === 1 ? "question has" : "questions have"} waited over 24 hours`;
  await notifyMany(ids, "mentor_reminder", {
    title,
    body: stale
      .slice(0, 3)
      .map((q) => `${lessonLabel(q.lessonId)} from ${shortName(q.user.name)}`)
      .join(" · "),
    url: "/admin/learn/questions",
    email: {
      subject: title,
      intro: "Oldest first:",
      lines: stale.slice(0, 15).map((q) => `<b>${esc(lessonLabel(q.lessonId))}</b> · ${esc(shortName(q.user.name))}<br><span style="color:#4a504c">${esc(q.question.slice(0, 160))}</span>`),
      cta: "Open the mentor queue",
    },
    sms: `Prospect: ${title}. Oldest: ${lessonLabel(stale[0].lessonId)}.`,
  });
  await prisma.mentorQuestion.updateMany({ where: { id: { in: stale.map((q) => q.id) } }, data: { remindedAt: new Date() } });
  return stale.length;
}

/** K.6 — the student hears back when their question is answered. */
export async function notifyQuestionAnswered(q: { id: string; userId: string; lessonId: string; answeredBy: string | null }) {
  const title = `${q.answeredBy ?? "A mentor"} answered your question on ${lessonLabel(q.lessonId)}`;
  await notify(q.userId, "mentor_answer", {
    title,
    body: "Open the lesson to read the answer.",
    url: `/learn/${q.lessonId}#mentor-questions`,
    email: { subject: title, intro: "Your mentor question has an answer. Open the lesson to read it.", cta: "Read the answer" },
  });
}
