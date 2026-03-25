import { test, expect } from "@playwright/test";

/**
 * Acceptance-style scenarios: describe user goals in plain language.
 * Extend with league creation / draft when those flows exist.
 */
test.describe("Acceptance: authentication", () => {
  test("As a new visitor, I can register and see myself signed in on the home page", async ({
    page,
  }) => {
    const email = `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.ipl-fantasy.local`;

    await page.goto("/register");
    await page.locator('input[name="name"]').fill("E2E User");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill("acceptance1");
    await page.getByRole("button", { name: /register/i }).click();

    await expect(page).toHaveURL("/", { timeout: 120_000 });
    await expect(page.getByText(/signed in as/i)).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });
});
