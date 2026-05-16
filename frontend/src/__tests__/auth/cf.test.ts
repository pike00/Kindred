import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as cfModule from "../../auth/cf"

describe("Cloudflare Access auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("cfEnabled", () => {
    it("returns false when authMode is undefined", () => {
      vi.stubEnv("VITE_AUTH_MODE", "")
      expect(cfModule.cfEnabled()).toBe(false)
    })

    it("returns false when authMode is not oidc or both", () => {
      vi.stubEnv("VITE_AUTH_MODE", "custom")
      expect(cfModule.cfEnabled()).toBe(false)
    })

    it("returns false when cfLogoutUrl is not set even with correct authMode", () => {
      vi.stubEnv("VITE_AUTH_MODE", "oidc")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "")
      expect(cfModule.cfEnabled()).toBe(false)
    })

    it("returns true when authMode is oidc and cfLogoutUrl is set", () => {
      vi.stubEnv("VITE_AUTH_MODE", "oidc")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "https://example.com/logout")
      expect(cfModule.cfEnabled()).toBe(true)
    })

    it("returns true when authMode is both and cfLogoutUrl is set", () => {
      vi.stubEnv("VITE_AUTH_MODE", "both")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "https://example.com/logout")
      expect(cfModule.cfEnabled()).toBe(true)
    })

    it("returns false when authMode is other and cfLogoutUrl is set", () => {
      vi.stubEnv("VITE_AUTH_MODE", "oauth")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "https://example.com/logout")
      expect(cfModule.cfEnabled()).toBe(false)
    })
  })

  describe("logout", () => {
    let locationHrefSpy: any
    let localStorageRemoveItemSpy: any

    beforeEach(() => {
      locationHrefSpy = vi.spyOn(window, "location", "get").mockReturnValue({
        ...window.location,
        href: "",
        origin: "https://app.example.com",
      })
      localStorageRemoveItemSpy = vi.spyOn(localStorage, "removeItem")
    })

    afterEach(() => {
      locationHrefSpy.mockRestore()
      localStorageRemoveItemSpy.mockRestore()
    })

    it("redirects to CF logout URL when cfEnabled and cfLogoutUrl is set", () => {
      vi.stubEnv("VITE_AUTH_MODE", "oidc")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "https://cf.example.com/logout")

      const _hrefSpy = vi.fn()
      Object.defineProperty(window, "location", {
        value: {
          href: "",
          origin: "https://app.example.com",
        },
        writable: true,
        configurable: true,
      })

      window.location.href = ""

      cfModule.logout()

      const expectedUrl =
        "https://cf.example.com/logout?returnTo=" +
        encodeURIComponent("https://app.example.com")
      expect(window.location.href).toBe(expectedUrl)
    })

    it("removes access token from localStorage when CF is disabled", () => {
      vi.stubEnv("VITE_AUTH_MODE", "oauth")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "")

      window.location.href = ""

      cfModule.logout()

      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith("access_token")
    })

    it("redirects to root when CF is disabled after removing token", () => {
      vi.stubEnv("VITE_AUTH_MODE", "oauth")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "")

      window.location.href = ""

      cfModule.logout()

      expect(window.location.href).toBe("/")
    })

    it("removes access token and redirects to root when cfEnabled is false but cfLogoutUrl exists", () => {
      vi.stubEnv("VITE_AUTH_MODE", "custom")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "https://cf.example.com/logout")

      window.location.href = ""

      cfModule.logout()

      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith("access_token")
      expect(window.location.href).toBe("/")
    })

    it("properly encodes returnTo parameter in CF logout URL", () => {
      vi.stubEnv("VITE_AUTH_MODE", "both")
      vi.stubEnv("VITE_CF_LOGOUT_URL", "https://cf.example.com/logout")

      window.location.href = ""

      cfModule.logout()

      const expectedReturnTo = encodeURIComponent("https://app.example.com")
      expect(window.location.href).toContain(`returnTo=${expectedReturnTo}`)
    })

    it("handles CF logout URL with existing query parameters", () => {
      vi.stubEnv("VITE_AUTH_MODE", "oidc")
      vi.stubEnv(
        "VITE_CF_LOGOUT_URL",
        "https://cf.example.com/logout?extra=param",
      )

      window.location.href = ""

      cfModule.logout()

      expect(window.location.href).toContain(
        "https://cf.example.com/logout?extra=param",
      )
      expect(window.location.href).toContain("returnTo=")
    })
  })
})
