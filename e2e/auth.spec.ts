import { test, expect } from "@playwright/test";
import { skipUnlessBackendIsUp, uniqueTestEmail } from "./helpers/backend";

test.beforeAll(async () => {
  await skipUnlessBackendIsUp(test);
});

test("register auto-signs in, and sign out reverts the header", async ({ page }) => {
  const email = uniqueTestEmail("e2e-register");

  await page.goto("/register");
  await page.getByLabel("Display name").fill("E2E Test User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-test-password-1");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/problems$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("an existing account can sign in", async ({ page }) => {
  const email = uniqueTestEmail("e2e-login");

  // Register first so there's a real account to log back into — this
  // suite doesn't assume any pre-seeded fixture data exists.
  await page.goto("/register");
  await page.getByLabel("Display name").fill("E2E Login User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-test-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/problems$/);
  await page.getByRole("button", { name: "Sign out" }).click();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-test-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/problems$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});
