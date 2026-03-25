import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { uniqueTestEmail } from "../helpers/test-email";

const hasDb = Boolean(
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("USER:PASSWORD"),
);

/**
 * Functional: multi-step behavior of the registration API (user-visible outcomes).
 */
describe.skipIf(!hasDb)("registration API (functional)", () => {
  it("rejects invalid JSON", async () => {
    const res = await POST(
      new Request("http://test/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await POST(
      new Request("http://test/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: uniqueTestEmail("bad-pw"),
          password: "short",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate email", async () => {
    const email = uniqueTestEmail("dup");
    const body = JSON.stringify({
      email,
      password: "longenough1",
    });

    const first = await POST(
      new Request("http://test/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
    );
    expect(first.status).toBe(200);

    const second = await POST(
      new Request("http://test/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
    );
    expect(second.status).toBe(409);

    await prisma.user.deleteMany({ where: { email } });
  });
});
