import { test, expect } from "@playwright/test";
import { skipUnlessBackendIsUp, uniqueTestEmail } from "./helpers/backend";

test.beforeAll(async () => {
  await skipUnlessBackendIsUp(test);
});

test("a signed-in user can file a bug report from the floating button", async ({ page }) => {
  const email = uniqueTestEmail("e2e-bugreport");

  await page.goto("/register");
  await page.getByLabel("Display name").fill("E2E Bug Reporter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-test-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/problems$/);

  await page.getByRole("button", { name: "Report bug" }).click();
  await expect(page.getByRole("dialog", { name: "Report a bug" })).toBeVisible();

  await page.getByLabel("What went wrong?").fill("The e2e suite is filing a real report on purpose.");
  await page.getByRole("button", { name: "Send report" }).click();

  await expect(page.getByText("Thanks — we've got it.")).toBeVisible();
});

test("a signed-out visitor doesn't see the report-bug button", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Report bug" })).not.toBeVisible();
});
