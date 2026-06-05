/// <reference types="vitest" />
import { createRequire } from "node:module"
import path from "node:path"
import { defineConfig } from "vitest/config"

// Resolve zod's real on-disk location regardless of package-manager layout
// (bun installs into frontend/node_modules; pnpm hoists to the workspace root).
const require = createRequire(import.meta.url)
// zod v4's "exports" map blocks require.resolve("zod/index.cjs"), so derive the
// raw file path from the package dir instead.
const zodCjs = path.join(
  path.dirname(require.resolve("zod/package.json")),
  "index.cjs",
)

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 15000,
    // Only run unit/component tests under src. The e2e/ directory holds
    // Playwright specs (run separately) that import node-only deps like uuid
    // and must not be collected by vitest.
    include: ["src/**/*.test.{ts,tsx}"],
    // Bun resolves zod v4 to TypeScript source via the "@zod/source" export
    // condition. Inlining forces vitest to transform it through vite instead.
    server: {
      deps: {
        inline: [/^zod/],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/routeTree.gen.ts",
        "src/client/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/**/*.d.ts",
        "src/test/**",
        // shadcn/ui generated components — vendor code, not business logic
        "src/components/ui/**",
        // TanStack Router route definitions — wiring/config, not testable logic
        "src/routes/**",
      ],
      thresholds: {
        global: {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Vitest's ESM transform loses zod's named `z` export (export { z } from
      // a namespace import). The CJS build correctly exports z; alias to it so
      // `import { z } from "zod"` works in the test environment.
      zod: zodCjs,
    },
  },
})
