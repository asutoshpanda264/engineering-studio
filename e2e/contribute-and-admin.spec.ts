import { test, expect } from "@playwright/test";
import { skipUnlessBackendIsUp } from "./helpers/backend";

/**
 * Self-registration always creates a plain USER (`RegisterRequest` has no
 * role field — see `engineering-studio-backend/api`'s `auth` package), so
 * this spec can't create its own CONTRIBUTOR/ADMIN fixtures the way the
 * other specs create throwaway USER accounts. It needs two pre-seeded
 * accounts, provided via env vars, and skips (not fails) if they're not
 * set — same "degrade to skip, not a red X" shape as the backend-liveness
 * check.
 *
 *   CONTRIBUTOR_TEST_EMAIL / CONTRIBUTOR_TEST_PASSWORD
 *   ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD
 */
const CONTRIBUTOR_EMAIL = process.env.CONTRIBUTOR_TEST_EMAIL;
const CONTRIBUTOR_PASSWORD = process.env.CONTRIBUTOR_TEST_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD;

test.beforeAll(async () => {
  await skipUnlessBackendIsUp(test);
  test.skip(
    !CONTRIBUTOR_EMAIL || !CONTRIBUTOR_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD,
    "Set CONTRIBUTOR_TEST_EMAIL/CONTRIBUTOR_TEST_PASSWORD/ADMIN_TEST_EMAIL/ADMIN_TEST_PASSWORD to real seeded accounts to run this spec."
  );
});

test("a contributor's submission moves through the admin queue to approved", async ({ page, context }) => {
  const title = `E2E question ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(CONTRIBUTOR_EMAIL!);
  await page.getByLabel("Password").fill(CONTRIBUTOR_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/problems$/);

  await page.goto("/contribute");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Body").fill("Submitted by the e2e suite.");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("cell", { name: title })).toBeVisible();

  // A second, clean browser context for the admin — keeps the contributor's
  // own signed-in session untouched rather than signing out mid-test.
  const adminPage = await context.browser()!.newPage();
  await adminPage.goto("/login");
  await adminPage.getByLabel("Email").fill(ADMIN_EMAIL!);
  await adminPage.getByLabel("Password").fill(ADMIN_PASSWORD!);
  await adminPage.getByRole("button", { name: "Sign in" }).click();
  await expect(adminPage).toHaveURL(/\/problems$/);

  await adminPage.goto("/admin");
  const row = adminPage.getByRole("row").filter({ hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row).not.toBeVisible();

  await adminPage.close();

  await page.goto("/contribute");
  const myRow = page.getByRole("row").filter({ hasText: title });
  await expect(myRow.getByText("Approved")).toBeVisible();
});
