import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const USER = { email: "e2e@prospect.test", password: "e2e-password-123" };
const TEMPLATE = path.join(process.cwd(), "public/templates/Prospect_Recruiting_Openings_Template.xlsx");

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(USER.email);
  await page.locator('input[type="password"]').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

const row = (page: Page, program: string) => page.locator("tr", { hasText: program });

test("openings: upload, re-upload, tracker CSV, pipeline, reminders", async ({ page }) => {
  await login(page);

  // The template uploads with zero errors and 11 openings.
  await page.goto("/recruiting/openings/upload");
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await expect(page.getByText("11 new", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("0 errors", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /Post to club/ }).check();
  await page.getByRole("button", { name: "Save 11 openings" }).click();
  await expect(page.getByText("Saved: 11 new, 0 updated.")).toBeVisible();

  // Re-uploading the same file changes nothing.
  await page.locator('input[type="file"]').setInputFiles(TEMPLATE);
  await expect(page.getByText("11 unchanged", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("0 new", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nothing to change" })).toBeDisabled();

  // A tracker-style CSV maps its headers automatically; unreadable dates are errors, not guesses.
  const dir = path.join(process.cwd(), "test-results");
  mkdirSync(dir, { recursive: true });
  const csv = path.join(dir, "tracker.csv");
  writeFileSync(
    csv,
    [
      "Company,Role,Location,Opening date,Closing date,Link,Category,Year",
      "Acme Capital,2027 IB Summer Analyst,Boston / Detroit,2026-09-01,Nov 15 2026,acme.example/jobs,Investment Banking,Junior",
      "Gamma LLC,Analyst,Chicago,10/01/2026,next week,,,",
    ].join("\n"),
  );
  await page.locator('input[type="file"]').setInputFiles(csv);
  await expect(page.getByText("2 new", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("1 errors", { exact: true })).toBeVisible();
  await expect(page.getByText(/Couldn't read Deadline "next week"/)).toBeVisible();

  // Openings page: defaults to the member's class year and track.
  await page.goto("/recruiting/openings");
  await expect(row(page, "2028 Sophomore Insight Program")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).first().click();
  await expect(row(page, "2027 Investment Banking Summer Analyst")).toBeVisible();

  // Add to pipeline → Remind me → Mark applied.
  const r = row(page, "2028 Sophomore Insight Program");
  await r.getByRole("button", { name: "Add to pipeline" }).click();
  await expect(r.getByText("In your pipeline · Target")).toBeVisible();
  await r.getByRole("button", { name: "Remind me" }).click();
  await expect(r.getByRole("button", { name: /Reminding · 7d/ })).toBeVisible();
  await r.getByRole("button", { name: "Mark applied" }).click();
  await expect(r.getByText("In your pipeline · Applied")).toBeVisible();
  await page.goto("/pipeline");
  await expect(page.getByText("Halvorsen & Pike").first()).toBeVisible();

  // Reminders go out through the daily job; the deadline shows on Home this week.
  await page.goto("/recruiting/openings");
  await page.getByRole("button", { name: "Reset filters" }).first().click();
  const ib = row(page, "2027 Investment Banking Summer Analyst");
  await ib.getByRole("button", { name: "Remind me" }).click();
  await expect(ib.getByRole("button", { name: /Reminding/ })).toBeVisible();
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const openingId = await ib.getAttribute("data-opening-id");
  expect(openingId).toBeTruthy();
  const bulk = await page.request.post("/api/bulk", { data: { entity: "openings", ids: [openingId], op: "set", field: "deadline", value: soon } });
  expect(bulk.ok()).toBeTruthy();
  const cron = await page.request.get("/api/cron/daily", { headers: { authorization: `Bearer ${process.env.E2E_CRON_SECRET ?? "e2e-cron"}` } });
  expect(cron.ok()).toBeTruthy();
  const notes = (await (await page.request.get("/api/notifications")).json()) as { items: { kind: string; body: string }[] };
  const reminder = notes.items.find((n) => n.kind === "opening_reminder");
  expect(reminder?.body).toContain("Deadline in 3 days: Halvorsen & Pike");
  await page.goto("/dashboard");
  await expect(page.getByText("Deadlines this week")).toBeVisible();
});
