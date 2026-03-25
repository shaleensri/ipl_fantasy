import { describe, it, expect } from "vitest";

/**
 * Black-box: only public HTTP — no imports from app source.
 * Set TEST_BASE_URL (e.g. http://127.0.0.1:3100) while a server is running,
 * or rely on Playwright for full black-box coverage.
 */
const base = process.env.TEST_BASE_URL?.replace(/\/$/, "") ?? "";

describe.skipIf(!base)("HTTP black-box", () => {
  it("GET /api/health matches contract", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; service: string };
    expect(json.ok).toBe(true);
    expect(json.service).toBe("ipl-fantasy-draft");
  });
});
