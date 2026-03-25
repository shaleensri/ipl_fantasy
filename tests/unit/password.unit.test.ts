import { describe, it, expect } from "vitest";
import { compare } from "bcryptjs";
import { hashPassword } from "@/lib/password";

describe("password (unit)", () => {
  it("hashPassword produces verifiable bcrypt hash", async () => {
    const h = await hashPassword("correct-horse-battery-staple");
    expect(h).toMatch(/^\$2[aby]\$/);
    await expect(compare("correct-horse-battery-staple", h)).resolves.toBe(true);
    await expect(compare("wrong", h)).resolves.toBe(false);
  });

  it("same input yields different hashes (salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});
