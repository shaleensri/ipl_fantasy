# Testing guide

This repo uses **two runners**:

| Layer              | Tool       | Location                  | Purpose                                                          |
| ------------------ | ---------- | ------------------------- | ---------------------------------------------------------------- |
| **Unit**           | Vitest     | `tests/unit/`             | Pure logic (`src/lib/*`, small pure helpers).                    |
| **Integration**    | Vitest     | `tests/integration/`      | Route handlers + real I/O (e.g. Prisma): register, leagues.      |
| **Functional**     | Vitest     | `tests/functional/`       | Multi-step API outcomes (status codes, DB side effects).         |
| **Black-box HTTP** | Vitest     | `tests/blackbox/`         | `fetch` only against `TEST_BASE_URL` (optional; no app imports). |
| **Smoke**          | Playwright | `tests/e2e/smoke.spec.ts` | Fast “is it alive?” checks with a real server.                   |
| **Acceptance**     | Playwright | `tests/e2e/acceptance/`   | User-goal scenarios (extend as features ship).                   |
| **E2E**            | Playwright | `tests/e2e/**/*.spec.ts`  | Full browser flows.                                              |
| **Performance**    | Playwright | `tests/e2e/performance/`  | Loose latency budgets (tighten against `next start` or staging). |
| **Coverage**       | Vitest     | `npm run test:coverage`   | v8 coverage for `src/lib`, `src/auth.ts`, `src/app/api/**`.      |

> **Note:** “Unix tests” in some checklists means **unit** tests. There are no separate shell-only suites unless you add them under e.g. `tests/sh/`.

## Prerequisites

- **Vitest (DB-backed suites):** valid `DATABASE_URL` in `.env` (e.g. `docker compose up -d`), then `npx prisma db push`.
- **Playwright:** `npx playwright install chromium` (once per machine). E2E starts `next dev` on port **3100** by default (`PLAYWRIGHT_PORT` overrides).

## Commands

```bash
npm run test                 # all Vitest suites
npm run test:unit
npm run test:integration
npm run test:functional
npm run test:blackbox        # set TEST_BASE_URL=http://127.0.0.1:3100
npm run test:coverage

npm run test:e2e             # full Playwright run (starts dev server)
npm run test:e2e:smoke
npm run test:e2e:acceptance
npm run test:e2e:performance

npm run test:all             # Vitest then Playwright
npm run test:ci              # coverage + Playwright (for CI)
```

## Maintaining tests when you add features

1. **Domain logic** → add/extend **`tests/unit`** for pure functions.
2. **API routes** → add **`tests/integration`** (import `GET`/`POST` from `src/app/api/.../route.ts`) and **`tests/functional`** for multi-step behavior.
3. **User-visible flows** → add **`tests/e2e/acceptance`** (and **`smoke`** if it should gate deploys).
4. **Public contract only** → optional **`tests/blackbox`** with `TEST_BASE_URL`, or rely on Playwright `request` / `page` (already black-box).
5. **Perf** → adjust budgets in **`tests/e2e/performance`** when moving from `next dev` to production-like environments.
6. **Coverage** → raise `thresholds` in **`vitest.config.ts`** as `src/lib` and `src/app/api` grow.

Integration/functional suites **skip** when `DATABASE_URL` still contains the placeholder `USER:PASSWORD`.
