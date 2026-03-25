import { test, expect } from "@playwright/test";

/**
 * Performance / budget checks — loose thresholds to tolerate cold dev compiles.
 * Tighten in CI against `next start` or a staging URL.
 */
test.describe("Performance budgets (API)", () => {
  test("GET /api/health completes within generous budget", async ({ request }) => {
    const start = performance.now();
    const res = await request.get("/api/health");
    const ms = performance.now() - start;

    expect(res.ok()).toBeTruthy();
    expect(ms).toBeLessThan(15_000);
  });

  test("home document responds within generous budget", async ({ page }) => {
    const start = performance.now();
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    const ms = performance.now() - start;

    expect(res?.ok()).toBeTruthy();
    expect(ms).toBeLessThan(30_000);
  });
});
