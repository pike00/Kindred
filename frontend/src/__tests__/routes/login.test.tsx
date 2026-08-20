import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Login } from "@/routes/login"
import { renderWithProviders } from "@/test/helpers"

// Mock Appearance component
vi.mock("@/components/Common/Appearance", () => ({
  Appearance: () => <div data-testid="appearance">Appearance</div>,
}))

// Mock router Link
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    component: vi.fn(),
  }),
  Link: ({ children, to, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  redirect: vi.fn(),
}))

// Mock useAuth hook
const mockLoginMutate = vi.fn()
vi.mock("@/hooks/useAuth", () => ({
  default: () => ({
    loginMutation: {
      mutate: mockLoginMutate,
      isPending: false,
    },
    logout: vi.fn(),
    user: null,
    isLoading: false,
  }),
  isLoggedIn: () => false,
}))

// Mock cfEnabled
vi.mock("@/auth/cf", () => ({
  cfEnabled: () => false,
  logout: vi.fn(),
}))

describe("Login component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("in development mode (DEV = true)", () => {
    beforeEach(() => {
      vi.stubEnv("DEV", true)
    })

    it("renders development login hint box and fill demo credentials button", () => {
      renderWithProviders(<Login />)

      expect(screen.getByTestId("development-login-hint")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /fill demo credentials/i }),
      ).toBeInTheDocument()
    })

    it("fills email and password fields when 'Fill demo credentials' button is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(<Login />)

      const emailInput = screen.getByTestId("email-input") as HTMLInputElement
      const passwordInput = screen.getByTestId(
        "password-input",
      ) as HTMLInputElement
      const fillButton = screen.getByRole("button", {
        name: /fill demo credentials/i,
      })

      expect(emailInput.value).toBe("")
      expect(passwordInput.value).toBe("")

      await user.click(fillButton)

      expect(emailInput.value).toBe("admin@example.com")
      expect(passwordInput.value).toBe("changethis")
    })

    it("submits the form with demo credentials after clicking the button", async () => {
      const user = userEvent.setup()
      renderWithProviders(<Login />)

      const fillButton = screen.getByRole("button", {
        name: /fill demo credentials/i,
      })
      await user.click(fillButton)

      const submitButton = screen.getByRole("button", { name: /^log in$/i })
      await user.click(submitButton)

      expect(mockLoginMutate).toHaveBeenCalledWith({
        username: "admin@example.com",
        password: "changethis",
      })
    })
  })

  describe("in production mode (DEV = false)", () => {
    beforeEach(() => {
      vi.stubEnv("DEV", false)
    })

    it("does not render development login hint box or fill demo credentials button", () => {
      renderWithProviders(<Login />)

      expect(
        screen.queryByTestId("development-login-hint"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: /fill demo credentials/i }),
      ).not.toBeInTheDocument()
    })
  })
})
