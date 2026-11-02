import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/client"
import { AuthGuardError } from "@/components/Common/AuthGuardError"

const leaveSession = vi.hoisted(() => vi.fn())
vi.mock("@/lib/session", () => ({ leaveSession }))
vi.mock("@/auth/cf", () => ({ cfEnabled: () => false }))
vi.mock("@/components/Common/ErrorComponent", () => ({
  default: () => <div>Route failed</div>,
}))

function apiError(status: number) {
  return new ApiError(
    { method: "GET", url: "/api/v1/private" },
    {
      url: "/api/v1/private",
      ok: false,
      status,
      statusText: status === 401 ? "Unauthorized" : "Forbidden",
      body: {},
    },
    status === 401 ? "Unauthorized" : "Forbidden",
  )
}

describe("AuthGuardError", () => {
  beforeEach(() => {
    leaveSession.mockClear()
  })

  it("clears the session and redirects on 401", () => {
    render(<AuthGuardError error={apiError(401)} />)
    expect(leaveSession).toHaveBeenCalledWith("/login")
  })

  it("renders a local permission error on 403 without logging out", () => {
    render(<AuthGuardError error={apiError(403)} />)
    expect(leaveSession).not.toHaveBeenCalled()
    expect(screen.getByText("Route failed")).toBeInTheDocument()
  })
})
