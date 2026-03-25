import { test, expect } from "@playwright/test";

/**
 * Smoke: fastest checks that the app is basically alive (deploy / CI gate).
 */
test.describe("smoke", () => {
  test("API health returns contract JSON", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    await expect(res).toBeOK();
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, service: "ipl-fantasy-draft" });
  });

  test("home page renders hero", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /IPL Fantasy Draft/i }),
    ).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
