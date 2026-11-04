/**
 * Seeds a local database for the browser tests: a test user and a PEB_00 student workbook built from
 * its walkthrough (inputs, labels, headers, answer cells), stored the way local development stores files.
 * DATABASE_URL=… npx tsx tests/seed-e2e.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import * as XLSX from "xlsx";
import type { Walkthrough } from "../src/lib/walkthroughs";

export const E2E_USER = { email: "e2e@prospect.test", password: "e2e-password-123", name: "Test Student" };
const KEY = "PEB_00_TVM_IRR_MOIC";

function buildWorkbook(w: Walkthrough): Buffer {
  const wb = XLSX.utils.book_new();
  const intro = XLSX.utils.aoa_to_sheet([
    ["PEB 00 · Time value of money, IRR and MOIC"],
    ["Fill in the yellow answer cells with formulas that reference the blue inputs."],
    ["Blue = inputs. Black = formulas. Yellow = your answers."],
  ]);
  XLSX.utils.book_append_sheet(wb, intro, "Instructions");
  for (const sheet of w.sheets) {
    const ws: XLSX.WorkSheet = {};
    let maxC = 1;
    let maxR = 1;
    const put = (a: string, cell: XLSX.CellObject) => {
      ws[a] = cell;
      const p = XLSX.utils.decode_cell(a);
      maxC = Math.max(maxC, p.c + 1);
      maxR = Math.max(maxR, p.r + 1);
    };
    const steps = w.steps.filter((s) => s.sheet === sheet);
    const firstRow = Math.min(...steps.map((s) => XLSX.utils.decode_cell(s.cell).r + 1));
    ws["A1"] = { t: "s", v: sheet };
    for (const s of steps) {
      const p = XLSX.utils.decode_cell(s.cell);
      if (s.label) put(XLSX.utils.encode_cell({ c: 0, r: p.r }), { t: "s", v: s.label });
      if (s.header) put(XLSX.utils.encode_cell({ c: p.c, r: firstRow - 2 }), { t: "s", v: s.header });
      for (const ref of s.references ?? []) {
        if (ref.sheet !== sheet || ref.ref.includes(":")) continue;
        const a = ref.ref.replace(/\$/g, "");
        if (ws[a] || w.steps.some((x) => x.sheet === sheet && x.cell === a)) continue;
        if (typeof ref.value === "number") put(a, { t: "n", v: ref.value, z: Math.abs(ref.value) < 1 && ref.value !== 0 ? "0.0%" : undefined });
        else if (typeof ref.value === "string") put(a, { t: "s", v: ref.value });
        const head = /\(([^()]*(?:\([^()]*\))?[^()]*)\)$/.exec(ref.label)?.[1];
        const hc = XLSX.utils.encode_cell({ c: XLSX.utils.decode_cell(a).c, r: firstRow - 2 });
        if (head && !ws[hc]) put(hc, { t: "s", v: head });
      }
    }
    ws["!ref"] = `A1:${XLSX.utils.encode_cell({ c: maxC, r: maxR })}`;
    ws["!cols"] = [{ wpx: 260 }];
    XLSX.utils.book_append_sheet(wb, ws, sheet);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function main() {
  // Local test databases only: this script resets the test user's workbook progress.
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(process.env.DATABASE_URL ?? "")) throw new Error("tests/seed-e2e.ts only runs against a local database");
  const prisma = new PrismaClient();
  const w = JSON.parse(readFileSync(path.join(process.cwd(), "content/walkthroughs", `${KEY}.walkthrough.json`), "utf8")) as Walkthrough;
  const data = buildWorkbook(w);
  const dir = path.join(process.env.TMPDIR ?? "/tmp", "prospect-workbooks");
  mkdirSync(dir, { recursive: true });
  const id = "e2e0000000000000beb00"; // hex only (the local store strips anything else)
  writeFileSync(path.join(dir, id), data);

  const user = await prisma.user.upsert({
    where: { email: E2E_USER.email },
    update: { passwordHash: await hash(E2E_USER.password, 10), accountActive: true },
    create: { email: E2E_USER.email, name: E2E_USER.name, passwordHash: await hash(E2E_USER.password, 10), onboardingDone: true, classYear: 2029, careerTracks: ["Investment Banking"] },
  });
  await prisma.workbookProgress.deleteMany({ where: { userId: user.id } });
  await prisma.lessonResource.upsert({
    where: { workbookKey_kind_version: { workbookKey: KEY, kind: "student", version: 1 } },
    update: { blobUrl: `local:${id}`, sizeBytes: data.length },
    create: { workbookKey: KEY, kind: "student", title: "PEB 00 student", blobUrl: `local:${id}`, fileName: `${KEY}.xlsx`, sizeBytes: data.length, version: 1, uploadedBy: user.id },
  });
  // An admin who is also an officer of a test club (for the openings upload tests).
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  const school = await prisma.school.upsert({ where: { id: "e2e-school" }, update: {}, create: { id: "e2e-school", name: "Michigan State University", shortName: "MSU", domain: "msu.edu" } as never });
  const club = await prisma.club.upsert({ where: { id: "e2e-club" }, update: {}, create: { id: "e2e-club", name: "PE@Broad", type: "finance", schoolId: school.id } as never });
  await prisma.clubMember.upsert({ where: { clubId_userId: { clubId: club.id, userId: user.id } }, update: { role: "officer", active: true }, create: { clubId: club.id, userId: user.id, role: "officer" } });
  // A second club member to duel with.
  const rival = await prisma.user.upsert({
    where: { email: "e2e-rival@prospect.test" },
    update: {},
    create: { email: "e2e-rival@prospect.test", name: "Rival Student", passwordHash: await hash(E2E_USER.password, 10), onboardingDone: true, classYear: 2028 },
  });
  await prisma.clubMember.upsert({ where: { clubId_userId: { clubId: club.id, userId: rival.id } }, update: { active: true }, create: { clubId: club.id, userId: rival.id } });
  // Fresh practice and challenge state for each run.
  await prisma.questionAttempt.deleteMany({ where: { userId: { in: [user.id, rival.id] } } });
  await prisma.userQuestionProgress.deleteMany({ where: { userId: { in: [user.id, rival.id] } } });
  await prisma.challenge.deleteMany({ where: { clubId: club.id, mode: { not: "weekly" } } });
  // Fresh study-group state: groups the test users created (duels and memberships go with them).
  await prisma.studyGroup.deleteMany({ where: { createdBy: { in: [user.id, rival.id] } } });
  await prisma.user.updateMany({ where: { id: { in: [user.id, rival.id] } }, data: { teamGroupId: null, teamJoinedAt: null } });
  // A firm, contact and conversation for the fit-question builder and prep page.
  await prisma.fitAnswer.deleteMany({ where: { userId: user.id } });
  await prisma.groupFinderResult.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { recruitingTarget: [], hometown: null } });
  const hl = await prisma.firm.upsert({ where: { userId_name: { userId: user.id, name: "Houlihan Lokey" } }, update: {}, create: { userId: user.id, name: "Houlihan Lokey", location: "Chicago", focus: "Restructuring" } });
  let dana = await prisma.contact.findFirst({ where: { userId: user.id, fullName: "Dana Smith" } });
  dana ??= await prisma.contact.create({
    data: { userId: user.id, firmId: hl.id, fullName: "Dana Smith", email: "dana@example.com", group: "Restructuring", title: "Associate", location: "Chicago, IL", school: "MSU", recruitingCategory: "IB", referralProbability: "MEDIUM" } as never,
  });
  if (!(await prisma.interaction.count({ where: { contactId: dana.id } }))) {
    await prisma.interaction.create({ data: { userId: user.id, contactId: dana.id, date: new Date("2026-10-20T15:00:00Z"), type: "COFFEE_CHAT", notes: "Talked about the group's creditor-side work on large bankruptcies" } as never });
  }
  // Fresh openings state for each run.
  await prisma.opportunity.deleteMany({ where: { userId: user.id, openingId: { not: null } } });
  await prisma.opening.deleteMany({ where: { clubId: { in: [club.id] } } });
  await prisma.opening.deleteMany({ where: { clubId: null, createdById: user.id } });
  await prisma.importBatch.deleteMany({ where: { userId: user.id, source: "openings" } });
  console.log("Seeded user", E2E_USER.email, "and", KEY);
  await prisma.$disconnect();
}

if (require.main === module) void main();
