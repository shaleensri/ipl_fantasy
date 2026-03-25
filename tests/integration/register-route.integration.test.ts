import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { uniqueTestEmail } from "../helpers/test-email";

const hasDb = Boolean(
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("USER:PASSWORD"),
);

describe.skipIf(!hasDb)("POST /api/auth/register (integration)", () => {
  it("creates a PLAYER user", async () => {
    const email = uniqueTestEmail("int-player");
    const saved = process.env.ADMIN_EMAILS;
    try {
      delete process.env.ADMIN_EMAILS;

      const res = await POST(
        new Request("http://test/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: "longenough1",
            name: "Integration",
          }),
        }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; role: string };
      expect(body.ok).toBe(true);
      expect(body.role).toBe("PLAYER");

      const row = await prisma.user.findUnique({ where: { email } });
      expect(row?.email).toBe(email);
      expect(row?.role).toBe("PLAYER");
    } finally {
      if (saved === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = saved;
      await prisma.user.deleteMany({ where: { email } });
    }
  });

  it("assigns ADMIN when email is in ADMIN_EMAILS", async () => {
    const email = uniqueTestEmail("int-admin");
    const saved = process.env.ADMIN_EMAILS;
    try {
      process.env.ADMIN_EMAILS = email;

      const res = await POST(
        new Request("http://test/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "longenough1" }),
        }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { role: string };
      expect(body.role).toBe("ADMIN");
    } finally {
      if (saved === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = saved;
      await prisma.user.deleteMany({ where: { email } });
    }
  });
});
