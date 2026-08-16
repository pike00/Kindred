import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockUseRouterState } = vi.hoisted(() => ({
  mockUseRouterState: vi.fn(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    useRouterState: mockUseRouterState,
  }
})

// Import after mocking
import { NavigationProgressBar } from "@/routes/_layout"

describe("NavigationProgressBar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing when status is idle", () => {
    mockUseRouterState.mockReturnValue(false)
    const { container } = render(<NavigationProgressBar />)
    expect(container.firstChild).toBeNull()
  })

  it("renders progressbar with aria-busy when status is pending", () => {
    mockUseRouterState.mockReturnValue(true)
    render(<NavigationProgressBar />)

    const progressbar = screen.getByRole("progressbar")
    expect(progressbar).toBeInTheDocument()
    expect(progressbar).toHaveAttribute("aria-busy", "true")
  })
})
