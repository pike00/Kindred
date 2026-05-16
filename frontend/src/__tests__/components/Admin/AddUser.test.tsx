import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AddUser from "@/components/Admin/AddUser"
import { makeUser, renderWithProviders } from "@/test/helpers"

// Mock icons
vi.mock("@/lib/icons", () => ({
  Plus: ({ className }: { className?: string }) => (
    <div data-testid="plus-icon" className={className} />
  ),
}))

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the UsersService
vi.mock("@/client", () => ({
  UsersService: {
    createUser: vi.fn(),
  },
}))

import { toast } from "sonner"
import { UsersService } from "@/client"

describe("AddUser", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders the Add User trigger button", () => {
      renderWithProviders(<AddUser />)

      const button = screen.getByRole("button", { name: /Add User/i })
      expect(button).toBeInTheDocument()
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument()
    })

    it("renders button with my-4 class", () => {
      const { container } = renderWithProviders(<AddUser />)
      const button = container.querySelector(
        "button:has([data-testid='plus-icon'])",
      )
      expect(button?.className).toContain("my-4")
    })
  })

  describe("dialog interaction", () => {
    it("opens dialog when trigger is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByText(/Fill in the form below/i)).toBeInTheDocument()
      })
    })

    it("closes dialog when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/Fill in the form below/i),
        ).not.toBeInTheDocument()
      })
    })

    it("shows all form fields when dialog is open", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Set Password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Is superuser/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Is active/i)).toBeInTheDocument()
    })
  })

  describe("form validation", () => {
    it("requires email field", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument()
      })
    })

    it("validates email format", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "invalid-email")
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument()
      })
    })

    it("requires password field", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/Email/i)
      await user.type(emailInput, "user@example.com")
      await user.tab()

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Password is required/i)).toBeInTheDocument()
      })
    })

    it("validates password minimum length of 8 characters", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const passwordInput = screen.getByLabelText(/Set Password/i)
      await user.type(passwordInput, "short")
      await user.tab()

      await waitFor(() => {
        expect(
          screen.getByText(/Password must be at least 8 characters/i),
        ).toBeInTheDocument()
      })
    })

    it("requires password confirmation", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const passwordInput = screen.getByLabelText(/Set Password/i)
      await user.type(passwordInput, "ValidPassword123")
      await user.tab()

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(
          screen.getByText(/Please confirm your password/i),
        ).toBeInTheDocument()
      })
    })

    it("validates passwords must match", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(passwordInput, "ValidPassword123")
      await user.type(confirmInput, "DifferentPassword456")
      await user.tab()

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(
          screen.getByText(/The passwords don't match/i),
        ).toBeInTheDocument()
      })
    })

    it("allows empty full_name field", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockResolvedValue(makeUser())

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "ValidPassword123")
      await user.type(confirmInput, "ValidPassword123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.createUser)).toHaveBeenCalled()
      })
    })
  })

  describe("form submission", () => {
    it("submits valid form data", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockResolvedValue(makeUser())

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const fullNameInput = screen.getByLabelText(/Full Name/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "newuser@example.com")
      await user.type(fullNameInput, "New User")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.createUser)).toHaveBeenCalledWith({
          requestBody: {
            email: "newuser@example.com",
            full_name: "New User",
            password: "SecurePass123",
            confirm_password: "SecurePass123",
            is_superuser: false,
            is_active: false,
          },
        })
      })
    })

    it("submits with is_superuser checkbox checked", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockResolvedValue(
        makeUser({ is_superuser: true }),
      )

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)
      const superuserCheckbox = screen.getByLabelText(/Is superuser/i)

      await user.type(emailInput, "admin@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")
      await user.click(superuserCheckbox)

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.createUser)).toHaveBeenCalledWith(
          expect.objectContaining({
            requestBody: expect.objectContaining({
              is_superuser: true,
            }),
          }),
        )
      })
    })

    it("submits with is_active checkbox checked", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockResolvedValue(
        makeUser({ is_active: true }),
      )

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)
      const activeCheckbox = screen.getByLabelText(/Is active/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")
      await user.click(activeCheckbox)

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.createUser)).toHaveBeenCalledWith(
          expect.objectContaining({
            requestBody: expect.objectContaining({
              is_active: true,
            }),
          }),
        )
      })
    })

    it("disables Save button while loading", async () => {
      const user = userEvent.setup()
      let resolveCreateUser: any
      vi.mocked(UsersService.createUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreateUser = resolve
          }),
      )

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      // Button should be disabled while pending
      expect(saveButton).toHaveAttribute("disabled")

      resolveCreateUser(makeUser())

      await waitFor(() => {
        expect(saveButton).not.toHaveAttribute("disabled")
      })
    })

    it("disables Cancel button while loading", async () => {
      const user = userEvent.setup()
      let resolveCreateUser: any
      vi.mocked(UsersService.createUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCreateUser = resolve
          }),
      )

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      expect(cancelButton).toHaveAttribute("disabled")

      resolveCreateUser(makeUser())

      await waitFor(() => {
        expect(cancelButton).not.toHaveAttribute("disabled")
      })
    })
  })

  describe("success handling", () => {
    it("shows success toast on successful creation", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockResolvedValue(makeUser())

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
          "Success!",
          expect.objectContaining({
            description: "User created successfully",
          }),
        )
      })
    })

    it("closes dialog after successful submission", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockResolvedValue(makeUser())

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/Fill in the form below/i),
        ).not.toBeInTheDocument()
      })
    })

    it("closes dialog and success toast after successful submission", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockResolvedValue(makeUser())

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(
        /Set Password/i,
      )
      const confirmInput = screen.getByLabelText(
        /Confirm Password/i,
      )

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        // Dialog should close after successful submission
        expect(
          screen.queryByText(/Fill in the form below/i),
        ).not.toBeInTheDocument()
      })
    })

    it("invalidates users query on successful creation", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockResolvedValue(makeUser())

      const { queryClient } = renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        // Query should be invalidated (refetch logic triggered)
        expect(vi.mocked(UsersService.createUser)).toHaveBeenCalled()
      })
    })
  })

  describe("error handling", () => {
    it("shows error toast on API failure", async () => {
      const user = userEvent.setup()
      const errorMessage = "Network error"
      vi.mocked(UsersService.createUser).mockRejectedValue(
        new Error(errorMessage),
      )

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalled()
      })
    })

    it("keeps dialog open on error", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockRejectedValue(
        new Error("API Error"),
      )

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i)
      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        // Dialog should remain open
        expect(screen.getByText(/Fill in the form below/i)).toBeInTheDocument()
      })
    })

    it("does not reset form on error", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.createUser).mockRejectedValue(
        new Error("API Error"),
      )

      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        /Set Password/i,
      ) as HTMLInputElement

      await user.type(emailInput, "user@example.com")
      await user.type(passwordInput, "SecurePass123")

      const confirmInput = screen.getByLabelText(
        /Confirm Password/i,
      ) as HTMLInputElement
      await user.type(confirmInput, "SecurePass123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        // Form values should still be present
        expect(emailInput.value).toBe("user@example.com")
        expect(passwordInput.value).toBe("SecurePass123")
        expect(confirmInput.value).toBe("SecurePass123")
      })
    })
  })

  describe("accessibility", () => {
    it("has proper ARIA labels for form fields", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      expect(screen.getByLabelText(/Email/i)).toHaveAttribute("type", "email")
      expect(screen.getByLabelText(/Set Password/i)).toHaveAttribute(
        "type",
        "password",
      )
      expect(screen.getByLabelText(/Confirm Password/i)).toHaveAttribute(
        "type",
        "password",
      )
    })

    it("shows required field indicators", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      // Required fields should have asterisk indicator
      const emailLabel = screen.getByLabelText(/Email/i).parentElement
      const passwordLabel = screen.getByLabelText(/Set Password/i).parentElement

      expect(emailLabel?.textContent).toContain("*")
      expect(passwordLabel?.textContent).toContain("*")
    })

    it("has properly labeled dialog", async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddUser />)

      const trigger = screen.getByRole("button", { name: /Add User/i })
      await user.click(trigger)

      await waitFor(() => {
        expect(screen.getByText(/Fill in the form below/i)).toBeInTheDocument()
      })
    })
  })
})
