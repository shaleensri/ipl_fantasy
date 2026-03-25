import { describe, it, expect, afterEach } from "vitest";
import { roleForNewUser } from "@/lib/register-role";

describe("register-role (unit)", () => {
  const prev = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prev;
  });

  it("defaults to PLAYER when ADMIN_EMAILS unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(roleForNewUser("anyone@example.com")).toBe("PLAYER");
  });

  it("assigns ADMIN for listed email (case-insensitive, trimmed)", () => {
    process.env.ADMIN_EMAILS = " Boss@Example.COM , other@x.test ";
    expect(roleForNewUser("boss@example.com")).toBe("ADMIN");
    expect(roleForNewUser("other@x.test")).toBe("ADMIN");
    expect(roleForNewUser("notlisted@example.com")).toBe("PLAYER");
  });
});
