import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cfEnabled, logout } from "@/auth/cf"
import { captureSession, resetSession } from "@/lib/session"

beforeEach(() => {
  vi.unstubAllEnvs()
  resetSession()
  vi.spyOn(window, "location", "get").mockReturnValue({
    ...window.location, origin: "https://app.example.com", assign: vi.fn(),
  })
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe("Cloudflare Access auth", () => {
  it.each([
    ["", "", false], ["custom", "https://cf.example.com/logout", false],
    ["oidc", "", false], ["oidc", "https://cf.example.com/logout", true],
    ["both", "https://cf.example.com/logout", true],
    ["oauth", "https://cf.example.com/logout", false],
  ])("mode %s and logout URL %s enable access: %s", (mode, url, expected) => {
    vi.stubEnv("VITE_AUTH_MODE", mode)
    vi.stubEnv("VITE_CF_LOGOUT_URL", url)
    expect(cfEnabled()).toBe(expected)
  })

  it("aborts the session and removes bearer state before Cloudflare logout", () => {
    vi.stubEnv("VITE_AUTH_MODE", "oidc")
    vi.stubEnv("VITE_CF_LOGOUT_URL", "https://cf.example.com/logout")
    localStorage.setItem("access_token", "old-token")
    const session = captureSession()
    logout()
    expect(session.signal.aborted).toBe(true)
    expect(localStorage.getItem("access_token")).toBeNull()
    expect(window.location.assign).toHaveBeenCalledWith(
      "https://cf.example.com/logout?returnTo=https%3A%2F%2Fapp.example.com",
    )
  })

  it("clears the session and returns to the app when Access is disabled", () => {
    vi.stubEnv("VITE_AUTH_MODE", "")
    localStorage.setItem("access_token", "old-token")
    logout()
    expect(localStorage.getItem("access_token")).toBeNull()
    expect(window.location.assign).toHaveBeenCalledWith("/")
  })
})
