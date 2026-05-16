import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import { renderWithProviders } from "@/test/helpers"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/client", () => ({
  UsersService: {
    deleteUserMe: vi.fn(),
  },
  OpenAPI: {
    BASE: "http://localhost",
    TOKEN: "test-token",
  },
}))

const mockLogout = vi.fn()

vi.mock("@/hooks/useAuth", () => ({
  default: vi.fn(() => ({
    user: {
      id: "u1",
      email: "alice@example.com",
      full_name: "Alice Smith",
      is_superuser: false,
      is_active: true,
    },
    logout: mockLogout,
    loginMutation: { mutate: vi.fn(), isPending: false },
    signUpMutation: { mutate: vi.fn(), isPending: false },
  })),
}))

describe("DeleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders delete account section with destructive styling", () => {
    const { container } = renderWithProviders(<DeleteAccount />)

    const heading = container.querySelector("h3")
    expect(heading).toBeInTheDocument()
    expect(heading?.textContent).toBe("Delete Account")
    expect(heading).toHaveClass("text-destructive")
  })

  it("renders warning text about data loss", () => {
    renderWithProviders(<DeleteAccount />)

    expect(
      screen.getByText(
        "Permanently delete your account and all associated data.",
      ),
    ).toBeInTheDocument()
  })

  it("renders delete confirmation button", () => {
    renderWithProviders(<DeleteAccount />)

    expect(
      screen.getByRole("button", { name: "Delete Account" }),
    ).toBeInTheDocument()
  })

  it("applies destructive border styling to container", () => {
    const { container } = renderWithProviders(<DeleteAccount />)

    const section = container.querySelector("div[class*='border-destructive']")
    expect(section).toBeInTheDocument()
  })

  it("renders with proper margin and padding", () => {
    const { container } = renderWithProviders(<DeleteAccount />)

    const section = container.firstChild
    expect(section).toHaveClass("mt-4", "p-4")
  })

  it("renders muted foreground text for description", () => {
    renderWithProviders(<DeleteAccount />)

    const description = screen.getByText(
      "Permanently delete your account and all associated data.",
    )
    expect(description).toHaveClass("text-muted-foreground")
  })

  it("renders small description text", () => {
    renderWithProviders(<DeleteAccount />)

    const description = screen.getByText(
      "Permanently delete your account and all associated data.",
    )
    expect(description).toHaveClass("text-sm")
  })
})
