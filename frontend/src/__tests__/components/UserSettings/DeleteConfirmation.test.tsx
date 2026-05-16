import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import DeleteConfirmation from "@/components/UserSettings/DeleteConfirmation"
import { createQueryClient, renderWithProviders } from "@/test/helpers"

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

describe("DeleteConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders trigger button with destructive variant", () => {
    renderWithProviders(<DeleteConfirmation />)

    const button = screen.getByRole("button", { name: "Delete Account" })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("bg-destructive")
  })

  it("opens confirmation dialog when trigger button is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText("Confirmation Required")).toBeInTheDocument()
    })
  })

  it("displays confirmation message with strong emphasis", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      const text = screen.getByText(/permanently deleted/, { exact: false })
      expect(text).toBeInTheDocument()
    })
  })

  it("displays warning that all account data will be deleted", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      const text = screen.getByText(/All your account data/, { exact: false })
      expect(text).toBeInTheDocument()
    })
  })

  it("displays that action cannot be undone", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      const text = screen.getByText(/cannot be undone/, { exact: false })
      expect(text).toBeInTheDocument()
    })
  })

  it("renders cancel button in dialog", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      const buttons = screen.getAllByRole("button", { name: "Cancel" })
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  it("renders delete button with destructive variant in dialog", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
      const dialogDeleteButton = deleteButtons[deleteButtons.length - 1]
      expect(dialogDeleteButton).toHaveClass("bg-destructive")
    })
  })

  it("closes dialog when cancel button is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText("Confirmation Required")).toBeInTheDocument()
    })

    const cancelButton = screen.getAllByRole("button", { name: "Cancel" })[0]
    await user.click(cancelButton)

    await waitFor(() => {
      expect(
        screen.queryByText("Confirmation Required"),
      ).not.toBeInTheDocument()
    })
  })

  it("calls deleteUserMe when delete button is clicked", async () => {
    const { UsersService } = await import("@/client")
    const mockDeleteUserMe = vi.mocked(UsersService.deleteUserMe)
    mockDeleteUserMe.mockResolvedValueOnce({})

    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText("Confirmation Required")).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
    const dialogDeleteButton = deleteButtons[deleteButtons.length - 1]
    await user.click(dialogDeleteButton)

    await waitFor(() => {
      expect(mockDeleteUserMe).toHaveBeenCalled()
    })
  })

  it("shows success toast after successful deletion", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.deleteUserMe).mockResolvedValueOnce({})

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText("Confirmation Required")).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
    const dialogDeleteButton = deleteButtons[deleteButtons.length - 1]
    await user.click(dialogDeleteButton)

    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalledWith("Success!", {
        description: "Your account has been successfully deleted",
      })
    })
  })

  it("calls logout after successful deletion", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.deleteUserMe).mockResolvedValueOnce({})

    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText("Confirmation Required")).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
    const dialogDeleteButton = deleteButtons[deleteButtons.length - 1]
    await user.click(dialogDeleteButton)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  it("shows error toast on API error", async () => {
    const { UsersService } = await import("@/client")
    const mockError = new Error("API Error")
    vi.mocked(UsersService.deleteUserMe).mockRejectedValueOnce(mockError)

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText("Confirmation Required")).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
    const dialogDeleteButton = deleteButtons[deleteButtons.length - 1]
    await user.click(dialogDeleteButton)

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("disables cancel button while mutation is pending", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.deleteUserMe).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({}), 100)
        }),
    )

    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText("Confirmation Required")).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
    const dialogDeleteButton = deleteButtons[deleteButtons.length - 1]
    await user.click(dialogDeleteButton)

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" })
    const dialogCancelButton = cancelButtons[cancelButtons.length - 1]

    expect(dialogCancelButton).toBeDisabled()
  })

  it("invalidates currentUser query after settled", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.deleteUserMe).mockResolvedValueOnce({})

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />, { queryClient })

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText("Confirmation Required")).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" })
    const dialogDeleteButton = deleteButtons[deleteButtons.length - 1]
    await user.click(dialogDeleteButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled()
    })
  })

  it("renders dialog with proper accessibility labels", async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteConfirmation />)

    const triggerButton = screen.getByRole("button", { name: "Delete Account" })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Confirmation Required" }),
      ).toBeInTheDocument()
    })
  })
})
