"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg border border-[#2a3140] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[#151a24]"
    >
      Sign out
    </button>
  );
}
