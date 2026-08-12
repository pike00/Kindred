import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

function gitHash(): string {
  try {
    const hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()
    if (hash) return hash
  } catch {
    // Ignore error when .git directory is absent (e.g. Docker build context)
  }
  const fromEnv = process.env.GIT_HASH?.trim()
  if (fromEnv) return fromEnv
  return ""
}

function appVersion(): string {
  // 1. Check APP_VERSION build-arg / environment variable
  const fromEnv = process.env.APP_VERSION?.trim()
  if (fromEnv) return fromEnv.replace(/^v/, "")

  // 2. Fall back to latest git tag if git repository is available
  try {
    const tag = execSync("git describe --tags --abbrev=0", { encoding: "utf8" }).trim()
    if (tag) return tag.replace(/^v/, "")
  } catch {
    // Ignore error when git command fails or repository is absent
  }

  // 3. Fall back to package.json files
  const candidatePaths = [
    path.resolve(__dirname, "./package.json"),
    path.resolve(__dirname, "../package.json"),
    path.resolve(process.cwd(), "frontend/package.json"),
    path.resolve(process.cwd(), "package.json"),
  ]

  for (const pkgPath of candidatePaths) {
    try {
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
        const ver = (pkg.version as string | undefined)?.trim()
        if (ver && ver !== "0.0.0") {
          return ver.replace(/^v/, "")
        }
      }
    } catch {
      // Continue checking next candidate path
    }
  }

  // 4. Default fallback version
  return "0.2.106"
}

const isE2E = process.env.VITE_E2E === "true"

// Build guard: prevent example.com placeholders from contaminating production bundles
if (process.env.NODE_ENV === "production" && process.env.VITE_API_URL?.includes("example.com")) {
  throw new Error(
    "[Vite Build Error] Invalid VITE_API_URL: 'example.com' placeholder detected. Use '' for same-origin relative URLs or a valid production origin.",
  )
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
    __APP_HASH__: JSON.stringify(gitHash()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // react-hook-form/@hookform are used only by lazy route-level form dialogs,
        // but ~20 lazy chunks share them so the bundler otherwise hoists them into
        // the eager entry chunk. Their own group keeps them off the critical path —
        // the chunk loads on demand with the first form. zod is deliberately NOT in
        // this group: it's used in route validateSearch (eager routing code), so it
        // stays near the entry; grouping it with rhf would drag rhf back in eagerly.
        // vendor-react is a separate group purely for long-term cache stability.
        advancedChunks: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 20,
            },
            {
              name: "forms",
              test: /node_modules[\\/](react-hook-form|@hookform)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    hmr: process.env.VITE_PUBLIC_HOST
      ? {
          host: process.env.VITE_PUBLIC_HOST,
          clientPort: 443,
          protocol: "wss",
        }
      : undefined,
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    ...(!isE2E
      ? [
          VitePWA({
            registerType: "prompt",
            includeAssets: [
              "/assets/icons/android-chrome-192x192.png",
              "/assets/icons/android-chrome-512x512.png",
              "/assets/icons/apple-touch-icon.png",
              "/assets/icons/maskable-192.png",
              "/assets/icons/maskable-512.png",
            ],
            manifest: {
              name: "Kindred",
              short_name: "Kindred",
              description: "Personal CRM",
              theme_color: "#67863a",
              background_color: "#fdfcfa",
              display: "standalone",
              scope: "/",
              start_url: "/",
              icons: [
                {
                  src: "/assets/icons/android-chrome-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "/assets/icons/android-chrome-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "/assets/icons/maskable-192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "maskable",
                },
                {
                  src: "/assets/icons/maskable-512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
                },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
              runtimeCaching: [
                {
                  urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
                  handler: "NetworkFirst",
                  options: {
                    cacheName: "api-cache",
                    expiration: {
                      maxEntries: 100,
                      maxAgeSeconds: 60 * 60 * 24, // 24 hours
                    },
                    cacheableResponse: {
                      statuses: [0, 200],
                    },
                  },
                },
              ],
            },
          }),
        ]
      : []),
  ],
})
