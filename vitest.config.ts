import path from "path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: path.resolve(__dirname, ".env") });

/**
 * Vitest: unit, integration, functional, and optional black-box (HTTP) suites.
 * E2E / smoke / acceptance / performance live under Playwright (tests/e2e).
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["tests/{unit,integration,functional,blackbox}/**/*.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/**/*.ts",
        "src/server/**/*.ts",
        "src/auth.ts",
        "src/app/api/**/*.ts",
      ],
      exclude: ["src/**/*.d.ts", "src/types/**", "src/middleware.ts", "**/*.config.*"],
      // Raise thresholds as more app code gains tests.
      thresholds: {
        lines: 10,
        functions: 10,
        branches: 5,
        statements: 10,
      },
    },
  },
});
