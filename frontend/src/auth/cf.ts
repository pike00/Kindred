// Cloudflare Access auth integration.
// No OAuth client -- CF edge handles login. This module just exposes:
//   - cfEnabled(): whether we're running behind CF Access
//   - logout(): redirect to CF Access logout
//
// Identity is served by the backend's /api/v1/users/me, which derives it
// from the Cf-Access-Jwt-Assertion header the edge injects. No frontend
// JWT handling.

export const cfEnabled = (): boolean => {
  const authMode = import.meta.env.VITE_AUTH_MODE as string | undefined
  const cfLogoutUrl = import.meta.env.VITE_CF_LOGOUT_URL as string | undefined
  return (authMode === "oidc" || authMode === "both") && !!cfLogoutUrl
}

export const logout = (): void => {
  const cfLogoutUrl = import.meta.env.VITE_CF_LOGOUT_URL as string | undefined
  if (cfEnabled() && cfLogoutUrl) {
    const returnTo = encodeURIComponent(window.location.origin)
    window.location.href = `${cfLogoutUrl}?returnTo=${returnTo}`
    return
  }
  localStorage.removeItem("access_token")
  window.location.href = "/"
}
