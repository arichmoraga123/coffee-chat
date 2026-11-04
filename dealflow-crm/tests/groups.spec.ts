import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const PASSWORD = "e2e-password-123";
type Q = { id: string; options: string[]; correctIndex: number };
const bank = JSON.parse(readFileSync(path.join(process.cwd(), "content/questions/PEB_Question_Bank_v2.json"), "utf8")) as Q[];

async function loginAs(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}

async function createGroup(page: Page, name: string) {
  await page.goto("/groups");
  await page.getByPlaceholder("e.g. LBO Lords").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/groups\/[^/]+$/);
  await expect(page.getByText("Your team").first()).toBeVisible();
  return page.url().split("/").pop()!;
}

test("study groups: teams, league, duels", async ({ browser }) => {
  test.setTimeout(150_000);
  const a = await loginAs(browser, "e2e@prospect.test");
  const b = await loginAs(browser, "e2e-rival@prospect.test");

  // Each creates a group; it becomes their team.
  const alpha = await createGroup(a, "Alpha Analysts");
  const bravo = await createGroup(b, "Bravo Bankers");

  // Alpha's captain challenges Bravo to a 3-day duel.
  await a.goto(`/groups/${alpha}`);
  const box = a.getByRole("combobox", { name: "Opponent group" });
  await box.click();
  await box.fill("Bravo");
  await a.getByRole("option", { name: /Bravo Bankers/ }).click();
  await a.getByRole("button", { name: "Send challenge" }).click();
  await expect(a.getByText(/Waiting for Bravo Bankers to accept/)).toBeVisible();

  // Bravo's captain accepts.
  await b.goto(`/groups/${bravo}`);
  await expect(b.getByText("Alpha Analysts challenged you to a 3-day duel.")).toBeVisible();
  await b.getByRole("button", { name: "Accept" }).click();
  await expect(b.getByText(/Live duel/)).toBeVisible();

  // Alpha answers 5 questions right (10 points); answering the same one again doesn't add more.
  for (const q of bank.slice(0, 5)) {
    const r = await a.request.post("/api/mcq/answer", { data: { questionId: q.id, chosenText: q.options[q.correctIndex] } });
    expect(r.ok()).toBeTruthy();
  }
  await a.request.post("/api/mcq/answer", { data: { questionId: bank[0].id, chosenText: bank[0].options[bank[0].correctIndex] } });
  await a.goto(`/groups/${alpha}`);
  await expect(a.getByText("Alpha Analysts leads by 10")).toBeVisible();
  await expect(a.getByRole("row", { name: /Test Student/ }).getByRole("cell").last()).toHaveText("10");

  // League table shows both teams, Alpha first.
  await a.goto("/groups");
  const rows = a.locator("tbody tr");
  await expect(rows.first()).toContainText("Alpha Analysts");
  await expect(rows.first()).toContainText("10");

  // Team switching is limited to once a week: joining Bravo by code works, switching does not.
  await b.goto(`/groups/${bravo}`);
  const code = (await b.locator("span.tracking-wider").first().innerText()).trim();
  await a.goto(`/groups?join=${code}`);
  await a.getByRole("button", { name: "Join with code" }).click();
  await a.waitForURL(new RegExp(`/groups/${bravo}$`));
  await a.getByRole("button", { name: "Switch to this team" }).click();
  await expect(a.getByText(/You can switch teams once a week/)).toBeVisible();

  // Time's up (moved in the local test database): the duel finishes with Alpha winning.
  const db = new PrismaClient();
  await db.groupDuel.updateMany({ where: { challengerId: alpha, status: "active" }, data: { endsAt: new Date(Date.now() - 1_000) } });
  await db.$disconnect();
  await a.goto(`/groups/${alpha}`);
  await expect(a.getByText("Past duels")).toBeVisible();
  await expect(a.getByText("Won", { exact: true })).toBeVisible();
  await expect(a.getByText("1–0", { exact: true })).toBeVisible();
});
