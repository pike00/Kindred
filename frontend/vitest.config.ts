/// <reference types="vitest" />
import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 15000,
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
      zod: path.resolve(__dirname, "./node_modules/zod/index.cjs"),
    },
  },
})
