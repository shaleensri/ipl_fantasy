import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

/**
 * Integration: exercise the real route handler (in-process), no HTTP server.
 */
describe("GET /api/health (integration)", () => {
  it("returns ok payload", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, service: "ipl-fantasy-draft" });
  });
});
