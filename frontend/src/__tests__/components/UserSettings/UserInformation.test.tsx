import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import UserInformation from "@/components/UserSettings/UserInformation"
import {
  createQueryClient,
  makeUser,
  renderWithProviders,
} from "@/test/helpers"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/client", () => ({
  UsersService: {
    updateUserMe: vi.fn(),
  },
  OpenAPI: {
    BASE: "http://localhost",
    TOKEN: "test-token",
  },
}))

vi.mock("@/hooks/useAuth", () => ({
  default: vi.fn(() => ({
    user: makeUser(),
    logout: vi.fn(),
    loginMutation: { mutate: vi.fn(), isPending: false },
    signUpMutation: { mutate: vi.fn(), isPending: false },
  })),
}))

describe("UserInformation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders section heading", () => {
    renderWithProviders(<UserInformation />)

    expect(screen.getByText("User Information")).toBeInTheDocument()
  })

  it("displays user full name in read mode", () => {
    renderWithProviders(<UserInformation />)

    expect(screen.getByText("Alice Smith")).toBeInTheDocument()
  })

  it("displays user email in read mode", () => {
    renderWithProviders(<UserInformation />)

    expect(screen.getByText("alice@example.com")).toBeInTheDocument()
  })

  it("renders form labels", () => {
    renderWithProviders(<UserInformation />)

    expect(screen.getByText("Full name")).toBeInTheDocument()
    expect(screen.getByText("Email")).toBeInTheDocument()
  })

  it("displays N/A when full_name is not set", async () => {
    const { default: useAuth } = await import("@/hooks/useAuth")
    vi.mocked(useAuth).mockReturnValueOnce({
      user: makeUser({ full_name: null }),
      logout: vi.fn(),
      loginMutation: { mutate: vi.fn(), isPending: false },
      signUpMutation: { mutate: vi.fn(), isPending: false },
    } as any)

    renderWithProviders(<UserInformation />)

    expect(screen.getByText("N/A")).toBeInTheDocument()
  })

  it("renders Edit button in read mode", () => {
    renderWithProviders(<UserInformation />)

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
  })

  it("toggles to edit mode when Edit button is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
      expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument()
    })
  })

  it("renders input fields in edit mode", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      const inputs = screen.getAllByRole("textbox")
      expect(inputs.length).toBe(2)
    })
  })

  it("renders Save and Cancel buttons in edit mode", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: "Edit" }),
      ).not.toBeInTheDocument()
    })
  })

  it("validates email format", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument()
    })

    const emailInput = screen.getByDisplayValue("alice@example.com")
    await user.clear(emailInput)
    await user.type(emailInput, "invalid-email")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument()
    })
  })

  it("disables Save button when form is not dirty", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: "Save" })
      expect(saveButton).toBeDisabled()
    })
  })

  it("enables Save button when form is dirty", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const fullNameInput = screen.getByDisplayValue("Alice Smith")
    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Bob Smith")

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: "Save" })
      expect(saveButton).not.toBeDisabled()
    })
  })

  it("successfully submits valid changes", async () => {
    const { UsersService } = await import("@/client")
    const mockUpdateUserMe = vi.mocked(UsersService.updateUserMe)
    mockUpdateUserMe.mockResolvedValueOnce({})

    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const fullNameInput = screen.getByDisplayValue("Alice Smith")
    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Bob Smith")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateUserMe).toHaveBeenCalledWith({
        requestBody: {
          full_name: "Bob Smith",
        },
      })
    })
  })

  it("submits only changed fields", async () => {
    const { UsersService } = await import("@/client")
    const mockUpdateUserMe = vi.mocked(UsersService.updateUserMe)
    mockUpdateUserMe.mockResolvedValueOnce({})

    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument()
    })

    const emailInput = screen.getByDisplayValue("alice@example.com")
    await user.clear(emailInput)
    await user.type(emailInput, "bob@example.com")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateUserMe).toHaveBeenCalledWith({
        requestBody: {
          email: "bob@example.com",
        },
      })
    })
  })

  it("shows success toast after successful update", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.updateUserMe).mockResolvedValueOnce({})

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const fullNameInput = screen.getByDisplayValue("Alice Smith")
    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Bob Smith")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalledWith("Success!", {
        description: "User updated successfully",
      })
    })
  })

  it("exits edit mode after successful update", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.updateUserMe).mockResolvedValueOnce({})

    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const fullNameInput = screen.getByDisplayValue("Alice Smith")
    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Bob Smith")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Save" }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    })
  })

  it("shows error toast on API error", async () => {
    const { UsersService } = await import("@/client")
    const mockError = new Error("API Error")
    vi.mocked(UsersService.updateUserMe).mockRejectedValueOnce(mockError)

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const fullNameInput = screen.getByDisplayValue("Alice Smith")
    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Bob Smith")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("cancels edit and reverts changes", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const fullNameInput = screen.getByDisplayValue("Alice Smith")
    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Bob Smith")

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Bob Smith")).not.toBeInTheDocument()
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    })
  })

  it("exits edit mode when cancel is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: "Cancel" }),
      ).not.toBeInTheDocument()
    })
  })

  it("disables buttons while mutation is pending", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.updateUserMe).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({}), 100)
        }),
    )

    const user = userEvent.setup()
    renderWithProviders(<UserInformation />)

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const fullNameInput = screen.getByDisplayValue("Alice Smith")
    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Bob Smith")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    expect(cancelButton).toBeDisabled()
  })

  it("invalidates queries after successful update", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.updateUserMe).mockResolvedValueOnce({})

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const user = userEvent.setup()
    renderWithProviders(<UserInformation />, { queryClient })

    const editButton = screen.getByRole("button", { name: "Edit" })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument()
    })

    const fullNameInput = screen.getByDisplayValue("Alice Smith")
    await user.clear(fullNameInput)
    await user.type(fullNameInput, "Bob Smith")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled()
    })
  })
})
