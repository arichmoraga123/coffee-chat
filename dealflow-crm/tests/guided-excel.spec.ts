import { expect, test, type Page } from "@playwright/test";

const USER = { email: "e2e@prospect.test", password: "e2e-password-123" };
const KEY = "PEB_00_TVM_IRR_MOIC";

const cell = (page: Page, a: string) => page.locator(`[data-cell="${a}"]`);

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(USER.email);
  await page.locator('input[type="password"]').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("guided Excel behaves like Excel", async ({ page }) => {
  await login(page);
  await page.goto(`/learn/workbooks/${KEY}/guided`);
  const grid = page.getByTestId("grid");
  await expect(cell(page, "E5")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Discounting" }).click();

  // 1. Arrow keys move the selection to E5.
  await cell(page, "A5").click();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("name-box")).toHaveText("E5");

  // 2–3. Typing starts editing; Enter commits, checks, and moves down.
  await page.keyboard.type("=B5/(1+C5)^D5");
  await page.keyboard.press("Enter");
  await expect(cell(page, "E5")).toContainText("$751.31");
  await expect(cell(page, "E5").getByLabel("Correct")).toBeVisible();
  await expect(page.getByTestId("name-box")).toHaveText("E6");

  // 4–5. Point mode: click B6, type, arrow keys insert C6, then D6.
  await page.keyboard.type("=");
  await cell(page, "B6").click();
  await page.keyboard.type("*(1+");
  await page.keyboard.press("ArrowLeft"); // D6
  await page.keyboard.press("ArrowLeft"); // C6
  await expect(page.getByTestId("cell-editor")).toHaveValue("=B6*(1+C6");
  await page.keyboard.type(")^");
  await page.keyboard.press("ArrowLeft"); // D6
  await expect(page.getByTestId("cell-editor")).toHaveValue("=B6*(1+C6)^D6");
  await page.keyboard.press("Enter");
  await expect(cell(page, "E6").getByLabel("Correct")).toBeVisible();

  // F4 cycles the reference under the cursor; Esc cancels.
  await cell(page, "E7").click();
  await page.keyboard.type("=B7");
  await page.keyboard.press("F4");
  await expect(page.getByTestId("cell-editor")).toHaveValue("=$B$7");
  await page.keyboard.press("F4");
  await expect(page.getByTestId("cell-editor")).toHaveValue("=B$7");
  await page.keyboard.press("Escape");
  await expect(cell(page, "E7")).toHaveText("");

  // Copy E5, paste into E7: relative references shift like Excel.
  await cell(page, "E5").click();
  await page.keyboard.press("Control+c");
  await cell(page, "E7").click();
  await page.keyboard.press("Control+v");
  await expect(cell(page, "E7").getByLabel("Correct")).toBeVisible();
  await expect(page.getByTestId("formula-bar")).toHaveValue("=B7/(1+C7)^D7");

  // 6. Fill the discount-factor grid: B19, Ctrl+R across to F19, then Ctrl+D down to row 22.
  await cell(page, "B19").click();
  await page.keyboard.type("=1/(1+$A19)^B$18");
  await page.keyboard.press("Enter");
  await expect(cell(page, "B19").getByLabel("Correct")).toBeVisible();
  await cell(page, "B19").click();
  await cell(page, "F19").click({ modifiers: ["Shift"] });
  await page.keyboard.press("Control+r");
  await cell(page, "F22").click({ modifiers: ["Shift"] });
  await page.keyboard.press("Control+d");
  for (const a of ["F19", "B22", "F22", "D21"]) await expect(cell(page, a).getByLabel("Correct")).toBeVisible();
  await cell(page, "F22").click();
  await expect(page.getByTestId("formula-bar")).toHaveValue("=1/(1+$A22)^F$18");

  // 7. Input cells are locked.
  await cell(page, "B5").click();
  await page.keyboard.type("5");
  await expect(page.getByRole("status")).toContainText("Inputs are locked");
  await expect(page.getByTestId("cell-editor")).toHaveCount(0);
  await expect(cell(page, "B5")).toContainText("1,000");

  // Undo restores the last change (the fill).
  await grid.focus();
  await page.keyboard.press("Control+z");
  await expect(cell(page, "F22")).toHaveText("");
  await expect(cell(page, "F22").getByLabel("Correct")).toHaveCount(0);
  await expect(cell(page, "F19").getByLabel("Correct")).toBeVisible();
});
