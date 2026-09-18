import { test, expect } from "@playwright/test";

/**
 * The one flow that needs nothing but this frontend's own dev server —
 * the simulation engine is entirely client-side. Deep-links straight into
 * a scenario (`?scenario=<id>`, the same mechanism `/problems`' own cards
 * use) rather than driving the Workshop's drag-and-drop canvas — matches
 * the precedent already set in `masterdoc/phase-frontend-integration`
 * ("via the scenario's own reference solution, to avoid driving React
 * Flow drag-and-drop through browser automation").
 */
test("landing page loads and Enter Workshop leads to a blank canvas", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /build\. simulate\. break\. learn\./i })).toBeVisible();

  await page.getByRole("link", { name: "Enter Workshop" }).first().click();
  await expect(page).toHaveURL(/\/workshop$/);
});

test("a deep-linked scenario runs and shows real results", async ({ page }) => {
  await page.goto("/workshop?scenario=internal-admin-dashboard");

  await page.getByRole("button", { name: "Run Simulation" }).click();
  await expect(page.getByText("Success rate")).toBeVisible({ timeout: 10_000 });
});
