import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-4 py-8">
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
