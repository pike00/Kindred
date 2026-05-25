import { mkdir, writeFile } from "node:fs/promises"
import { request } from "@playwright/test"

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173"
const API_URL = BASE_URL.replace(":5173", ":8001")

async function globalSetup() {
  const ctx = await request.newContext({ baseURL: API_URL })

  // The dev-tier Traefik returns transient 404s for /api/v1/login/access-token
  // when CrowdSec is restarting or the backend has just bounced. Retry a
  // few times before declaring failure.
  let res = await ctx.post("/api/v1/login/access-token", {
    form: {
      username: process.env.E2E_TEST_EMAIL ?? "admin@example.com",
      password: process.env.E2E_TEST_PASSWORD ?? "changethis",
    },
  })
  for (let attempt = 0; !res.ok() && attempt < 3; attempt++) {
    await new Promise((r) => setTimeout(r, 1500))
    res = await ctx.post("/api/v1/login/access-token", {
      form: {
        username: process.env.E2E_TEST_EMAIL ?? "admin@example.com",
        password: process.env.E2E_TEST_PASSWORD ?? "changethis",
      },
    })
  }

  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`)
  }

  const { access_token } = await res.json()

  await mkdir("e2e/.auth", { recursive: true })
  await writeFile(
    "e2e/.auth/user.json",
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [{ name: "access_token", value: access_token }],
        },
      ],
    }),
  )

  await ctx.dispose()
}

export default globalSetup
