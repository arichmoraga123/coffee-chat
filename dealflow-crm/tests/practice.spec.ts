import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const USER = { email: "e2e@prospect.test", password: "e2e-password-123" };
type Q = { id: string; lessonId: string; difficulty: string; options: string[]; correctIndex: number };
const bank = JSON.parse(readFileSync(path.join(process.cwd(), "content/questions/PEB_Question_Bank_v2.json"), "utf8")) as Q[];
const lid = (l: string) => l.replace(".", "-");

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(USER.email);
  await page.locator('input[type="password"]').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("practice modes and challenge question picking", async ({ page }) => {
  await login(page);
  const get = async (qs: string) => (await (await page.request.get(`/api/mcq/practice?${qs}`)).json()) as { questions: { id: string; lessonId: string; difficulty: string }[]; note?: string };

  // Hard only, for one module.
  const hard = await get("mode=hard&module=8&limit=30");
  expect(hard.questions.length).toBeGreaterThan(0);
  expect(hard.questions.every((q) => q.difficulty === "Hard" && q.lessonId.startsWith("8-"))).toBeTruthy();

  // Weak spots needs 5 answers in a lesson first.
  expect((await get("mode=weak")).questions).toHaveLength(0);

  // Answer lesson 1.1 wrong 5 times and lesson 2.1 right 5 times.
  const answer = (q: Q, right: boolean) =>
    page.request.post("/api/mcq/answer", { data: { questionId: q.id, chosenText: q.options[right ? q.correctIndex : (q.correctIndex + 1) % 4], msToAnswer: 1000 } });
  const l11 = bank.filter((q) => lid(q.lessonId) === "1-1").slice(0, 5);
  const l21 = bank.filter((q) => lid(q.lessonId) === "2-1").slice(0, 5);
  for (const q of l11) expect((await answer(q, false)).ok()).toBeTruthy();
  for (const q of l21) expect((await answer(q, true)).ok()).toBeTruthy();

  const weak = await get("mode=weak&limit=50");
  expect(weak.note).toContain("1.1 (0%)");
  expect(weak.questions.some((q) => q.lessonId === "1-1")).toBeTruthy();

  // Missed before: the five misses, oldest first; a later right answer removes one.
  await answer(l11[0], true);
  const missed = await get("mode=missed&limit=50");
  expect(missed.questions.map((q) => q.id)).toEqual(l11.slice(1).map((q) => q.id));

  // The Practice page shows the new modes.
  await page.goto("/practice");
  await page.getByRole("radio", { name: "Missed before" }).click();
  await page.getByRole("button", { name: /Start/ }).click();
  await expect(page.getByText("4 questions you missed, oldest first")).toBeVisible();

  // A duel on a 9-question lesson tops up from the same module and says so.
  const byLesson = new Map<string, Q[]>();
  for (const q of bank) byLesson.set(lid(q.lessonId), [...(byLesson.get(lid(q.lessonId)) ?? []), q]);
  const nine = [...byLesson.entries()].find(([, qs]) => qs.length === 9)![0];
  const users = await page.request.get("/api/search/members?q=Rival");
  const rivalId = ((await users.json()) as { results: { value: string }[] }).results[0]?.value;
  expect(rivalId).toBeTruthy();
  const created = await page.request.post("/api/challenges", { data: { to: rivalId, length: 10, topic: { lessons: [nine] } } });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: string };
  const state = JSON.stringify(await (await page.request.get(`/api/challenges/${id}/state`)).json());
  expect(state).toContain(`Includes 1 question from Module ${nine.split("-")[0]}`);
});
