import { expect, test, type Page } from "@playwright/test";

const USER = { email: "e2e@prospect.test", password: "e2e-password-123" };

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(USER.email);
  await page.locator('input[type="password"]').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function pick(page: Page, label: string, text: string) {
  const box = page.getByRole("combobox", { name: label });
  await box.click();
  await box.fill(text);
  await page.getByRole("option", { name: new RegExp(text) }).first().click();
}

test("fit questions, Group Finder, prep pack and admin editing", async ({ page }) => {
  test.setTimeout(150_000);
  await login(page);

  // Fit questions: categories on the left, a firm question pre-filled from the rolodex.
  await page.goto("/stories/fit?q=why-firm");
  await expect(page.getByRole("navigation", { name: "Fit questions" }).getByText("Strengths, weaknesses & fit")).toBeVisible();
  await pick(page, "Choose a firm", "Houlihan Lokey");
  await expect(page.getByRole("heading", { name: "Why Houlihan Lokey?" })).toBeVisible();
  await page.getByRole("checkbox", { name: /Dana Smith/ }).check();
  // With the "people" field empty, the checked conversation fills [people].
  await page.getByRole("button", { name: "Assemble draft" }).click();
  const draft = page.getByLabel("Your draft");
  await expect(draft).toHaveValue(/^Talking with Dana Smith, what stood out was \[specific\]/);
  // The student's own words win once they fill the field.
  await page.getByLabel("People you spoke with and what stood out").fill("an associate in restructuring");
  await page.getByRole("button", { name: "Assemble draft" }).click();
  await expect(draft).toHaveValue(/^Talking with an associate in restructuring/);
  await expect(page.getByText("Still to fill: [specific], [platform strength], [deal], [fit]")).toBeVisible();
  // Two saved versions can be compared.
  await expect(page.getByRole("heading", { name: "Versions" })).toBeVisible();
  const boxes = page.getByRole("checkbox", { name: /Compare version/ });
  await expect(boxes).toHaveCount(2);
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await expect(page.locator(".line-through", { hasText: "Dana" })).toBeVisible();

  // Practice out loud → practiced.
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "I nailed it" }).click();
  await expect(page.getByRole("button", { name: /Why our firm\?/ }).getByLabel("Practiced")).toBeVisible();

  // Group Finder with the keyboard (tech student persona).
  await page.goto("/stories/group-finder");
  const tech = { q1: 0, q2: 2, q3: 2, q4: 2, q5: 1, q6: 2, q7: 1, q8: 0, q9: 3, q10: 3, q11: 2, q12: 4, q13: 1, q14: 1 };
  for (const i of Object.values(tech)) {
    await page.keyboard.press(String(i + 1));
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "Technology, Media & Telecom (TMT)" }).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("You picked “A new AI chip or software launch”")).toBeVisible();
  await page.getByRole("button", { name: "Add to my targets" }).first().click();
  await expect(page.getByText("TMT added to your targets")).toBeVisible();
  await page.getByRole("link", { name: /Start your “Why TMT” answer/ }).click();
  await expect(page.getByRole("heading", { name: "Why Technology, Media & Telecom (TMT)?" })).toBeVisible();
  await expect(page.getByText(/Your Group Finder .*Technology, Media & Telecom \(TMT\) 100/)).toBeVisible();

  // Interview prep pack from the firm page.
  await page.goto("/firms");
  await page.getByRole("link", { name: "Houlihan Lokey" }).first().click();
  await page.getByRole("link", { name: "Prep for interview" }).click();
  await expect(page.getByRole("heading", { name: "Why Houlihan Lokey?" })).toBeVisible();
  await expect(page.getByText("Dana Smith").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Print/ })).toBeVisible();

  // Admin: persona tests pass with the stored weights; edits show up for students.
  await page.goto("/admin/fit");
  await page.getByRole("tab", { name: "Questionnaire weights" }).click();
  await page.getByRole("button", { name: "Run persona tests" }).click();
  await expect(page.getByLabel("Pass")).toHaveCount(6);
  await page.getByRole("tab", { name: "Fit questions" }).click();
  await pick(page, "Question", "Why investment banking");
  const prompt = page.getByLabel(/^Prompt/);
  await prompt.fill("Why investment banking (edited)?");
  await page.getByRole("button", { name: "Save question" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.goto("/stories/fit?q=why-ib");
  await expect(page.getByRole("heading", { name: "Why investment banking (edited)?" })).toBeVisible();
  // Put it back.
  await page.goto("/admin/fit");
  await pick(page, "Question", "edited");
  await page.getByLabel(/^Prompt/).fill("Why investment banking?");
  await page.getByRole("button", { name: "Save question" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // Cohort view shows the top group.
  await page.goto("/admin/learn/cohort?club=e2e-club");
  await expect(page.getByText("Technology, Media & Telecom (TMT) (100)")).toBeVisible();

  // Underfilled lessons view exists.
  await page.goto("/admin/questions");
  await expect(page.getByText(/Underfilled lessons \(0\)/)).toBeVisible();
});
