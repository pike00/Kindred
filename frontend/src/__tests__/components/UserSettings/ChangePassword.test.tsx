import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/helpers"
import ChangePassword from "@/components/UserSettings/ChangePassword"

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API client
vi.mock("@/client", () => ({
  UsersService: {
    updatePasswordMe: vi.fn(),
  },
  OpenAPI: {
    BASE: "http://localhost",
    TOKEN: "test-token",
  },
}))

describe("ChangePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders all three password input fields", () => {
    renderWithProviders(<ChangePassword />)

    expect(screen.getByTestId("current-password-input")).toBeInTheDocument()
    expect(screen.getByTestId("new-password-input")).toBeInTheDocument()
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument()
  })

  it("renders section heading", () => {
    renderWithProviders(<ChangePassword />)

    expect(screen.getByText("Change Password")).toBeInTheDocument()
  })

  it("renders submit button with correct text", () => {
    renderWithProviders(<ChangePassword />)

    expect(screen.getByRole("button", { name: "Update Password" })).toBeInTheDocument()
  })

  it("disables submit button while mutation is pending", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.updatePasswordMe).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({}), 100)
        })
    )

    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId("current-password-input")
    const newPasswordInput = screen.getByTestId("new-password-input")
    const confirmPasswordInput = screen.getByTestId("confirm-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(currentPasswordInput, "oldPassword123")
    await user.type(newPasswordInput, "newPassword456")
    await user.type(confirmPasswordInput, "newPassword456")

    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it("validates that current_password is required", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const newPasswordInput = screen.getByTestId("new-password-input")
    const confirmPasswordInput = screen.getByTestId("confirm-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(newPasswordInput, "newPassword456")
    await user.type(confirmPasswordInput, "newPassword456")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeInTheDocument()
    })
  })

  it("validates that new_password is required", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId("current-password-input")
    const confirmPasswordInput = screen.getByTestId("confirm-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(currentPasswordInput, "oldPassword123")
    await user.type(confirmPasswordInput, "newPassword456")
    await user.click(submitButton)

    await waitFor(() => {
      const messages = screen.getAllByText("Password is required")
      expect(messages.length).toBeGreaterThanOrEqual(1)
    })
  })

  it("validates that current_password must be at least 8 characters", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId("current-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(currentPasswordInput, "short")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
    })
  })

  it("validates that new_password must be at least 8 characters", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId("current-password-input")
    const newPasswordInput = screen.getByTestId("new-password-input")
    const confirmPasswordInput = screen.getByTestId("confirm-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(currentPasswordInput, "oldPassword123")
    await user.type(newPasswordInput, "short")
    await user.type(confirmPasswordInput, "short")
    await user.click(submitButton)

    await waitFor(() => {
      const messages = screen.getAllByText("Password must be at least 8 characters")
      expect(messages.length).toBeGreaterThanOrEqual(1)
    })
  })

  it("validates that passwords must match", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId("current-password-input")
    const newPasswordInput = screen.getByTestId("new-password-input")
    const confirmPasswordInput = screen.getByTestId("confirm-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(currentPasswordInput, "oldPassword123")
    await user.type(newPasswordInput, "newPassword456")
    await user.type(confirmPasswordInput, "differentPassword789")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("The passwords don't match")).toBeInTheDocument()
    })
  })

  it("successfully submits valid password change", async () => {
    const { UsersService } = await import("@/client")
    const mockUpdatePasswordMe = vi.mocked(UsersService.updatePasswordMe)
    mockUpdatePasswordMe.mockResolvedValueOnce({})

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId("current-password-input")
    const newPasswordInput = screen.getByTestId("new-password-input")
    const confirmPasswordInput = screen.getByTestId("confirm-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(currentPasswordInput, "oldPassword123")
    await user.type(newPasswordInput, "newPassword456")
    await user.type(confirmPasswordInput, "newPassword456")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdatePasswordMe).toHaveBeenCalledWith({
        requestBody: {
          current_password: "oldPassword123",
          new_password: "newPassword456",
          confirm_password: "newPassword456",
        },
      })
    })

    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalledWith("Success!", {
        description: "Password updated successfully",
      })
    })
  })

  it("clears form after successful password change", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.updatePasswordMe).mockResolvedValueOnce({})

    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId(
      "current-password-input"
    ) as HTMLInputElement
    const newPasswordInput = screen.getByTestId("new-password-input") as HTMLInputElement
    const confirmPasswordInput = screen.getByTestId(
      "confirm-password-input"
    ) as HTMLInputElement
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(currentPasswordInput, "oldPassword123")
    await user.type(newPasswordInput, "newPassword456")
    await user.type(confirmPasswordInput, "newPassword456")
    await user.click(submitButton)

    await waitFor(() => {
      expect(currentPasswordInput.value).toBe("")
      expect(newPasswordInput.value).toBe("")
      expect(confirmPasswordInput.value).toBe("")
    })
  })

  it("shows error toast on API error", async () => {
    const { UsersService } = await import("@/client")
    const mockError = new Error("Network error")
    vi.mocked(UsersService.updatePasswordMe).mockRejectedValueOnce(mockError)

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId("current-password-input")
    const newPasswordInput = screen.getByTestId("new-password-input")
    const confirmPasswordInput = screen.getByTestId("confirm-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.type(currentPasswordInput, "oldPassword123")
    await user.type(newPasswordInput, "newPassword456")
    await user.type(confirmPasswordInput, "newPassword456")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("handles validation for all fields empty", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const submitButton = screen.getByRole("button", { name: "Update Password" })
    await user.click(submitButton)

    await waitFor(() => {
      const requiredMessages = screen.getAllByText("Password is required")
      expect(requiredMessages.length).toBeGreaterThanOrEqual(2)
    })
  })

  it("clears error message when user starts typing", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const currentPasswordInput = screen.getByTestId("current-password-input")
    const submitButton = screen.getByRole("button", { name: "Update Password" })

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeInTheDocument()
    })

    await user.type(currentPasswordInput, "oldPassword123")

    await waitFor(() => {
      expect(screen.queryByText("Password is required")).not.toBeInTheDocument()
    })
  })

  it("renders aria-invalid attributes on invalid fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChangePassword />)

    const submitButton = screen.getByRole("button", { name: "Update Password" })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId("current-password-input")).toHaveAttribute(
        "aria-invalid",
        "true"
      )
    })
  })

  it("renders with correct field labels", () => {
    renderWithProviders(<ChangePassword />)

    expect(screen.getByLabelText("Current Password")).toBeInTheDocument()
    expect(screen.getByLabelText("New Password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument()
  })
})
