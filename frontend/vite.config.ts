import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

function gitHash(): string {
  if (process.env.GIT_HASH) return process.env.GIT_HASH
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

function appVersion(): string {
  // Footer renders as "v{APP_VERSION}", so strip any leading "v" here.
  const raw =
    process.env.APP_VERSION ??
    (() => {
      try {
        return execSync("git describe --tags --abbrev=0", {
          encoding: "utf8",
        }).trim()
      } catch {
        const pkg = JSON.parse(
          readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
        )
        return pkg.version
      }
    })()
  return raw.replace(/^v/, "")
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
  ],
})
