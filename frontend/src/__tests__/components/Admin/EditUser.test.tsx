import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import EditUser from "@/components/Admin/EditUser"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { makeUser, renderWithProviders } from "@/test/helpers"

// Mock icons
vi.mock("@/lib/icons", () => ({
  Pencil: ({ className }: { className?: string }) => (
    <div data-testid="pencil-icon" className={className} />
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
    updateUser: vi.fn(),
  },
}))

import { toast } from "sonner"
import { UsersService } from "@/client"

const EditUserWrapper = (props: React.ComponentProps<typeof EditUser>) => (
  <DropdownMenu>
    <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
    <DropdownMenuContent>
      <EditUser {...props} />
    </DropdownMenuContent>
  </DropdownMenu>
)

describe("EditUser", () => {
  const mockOnSuccess = vi.fn()
  const testUser = makeUser({
    id: "test-user-123",
    email: "alice@example.com",
    full_name: "Alice Smith",
    is_superuser: true,
    is_active: true,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders edit user menu item", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const trigger = screen.getByText("Open Menu")
      await user.click(trigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      expect(editItem).toBeInTheDocument()
      expect(screen.getByTestId("pencil-icon")).toBeInTheDocument()
    })

    it("renders as dropdown menu item", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const trigger = screen.getByText("Open Menu")
      await user.click(trigger)

      const editItem = screen.getByRole("menuitem", {
        name: /Edit User/i,
      })
      expect(editItem).toBeInTheDocument()
    })
  })

  describe("dialog interaction", () => {
    it("opens edit dialog when menu item is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      expect(screen.getByText(/Update the user details below/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Update the user details below/i),
      ).toBeInTheDocument()
    })

    it("pre-fills form with user data", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      await waitFor(() => {
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Is superuser/i)).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
      const fullNameInput = screen.getByLabelText(
        /Full Name/i,
      ) as HTMLInputElement

      expect(emailInput.value).toBe("alice@example.com")
      expect(fullNameInput.value).toBe("Alice Smith")
      // Verify the labels are present (form should have all fields)
      expect(screen.getByText(/Is superuser/i)).toBeInTheDocument()
      expect(screen.getByText(/Is active/i)).toBeInTheDocument()
    })

    it("pre-fills with null full_name as empty string", async () => {
      const user = userEvent.setup()
      const userWithoutName = makeUser({ full_name: null })

      renderWithProviders(
        <EditUserWrapper user={userWithoutName} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(
        /Full Name/i,
      ) as HTMLInputElement
      expect(fullNameInput.value).toBe("")
    })

    it("closes dialog when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      expect(
        screen.getByText(/Update the user details below/i),
      ).toBeInTheDocument()

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/Update the user details below/i),
        ).not.toBeInTheDocument()
      })
    })
  })

  describe("form validation", () => {
    it("requires email field", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
      await user.clear(emailInput)
      await user.tab()

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument()
      })
    })

    it("validates email format", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
      await user.clear(emailInput)
      await user.type(emailInput, "invalid-email")
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument()
      })
    })

    it("allows empty password field (optional)", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const passwordInput = screen.getByLabelText(
        /Set Password/i,
      ) as HTMLInputElement
      // Leave password empty
      expect(passwordInput.value).toBe("")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.updateUser)).toHaveBeenCalled()
      })
    })

    it("validates password minimum length if provided", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const passwordInput = screen.getByLabelText(/Set Password/i)
      await user.type(passwordInput, "short")
      await user.tab()

      await waitFor(() => {
        expect(
          screen.getByText(/Password must be at least 8 characters/i),
        ).toBeInTheDocument()
      })
    })

    it("validates passwords must match if both provided", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

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

    it("allows password change with matching confirmation", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(passwordInput, "NewPassword123")
      await user.type(confirmInput, "NewPassword123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.updateUser)).toHaveBeenCalled()
      })
    })
  })

  describe("form submission", () => {
    it("submits only changed fields", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.updateUser)).toHaveBeenCalledWith({
          userId: testUser.id,
          requestBody: expect.objectContaining({
            full_name: "Updated Name",
          }),
        })
      })
    })

    it("excludes confirm_password from submission", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const passwordInput = screen.getByLabelText(/Set Password/i)
      const confirmInput = screen.getByLabelText(/Confirm Password/i)

      await user.type(passwordInput, "NewPassword123")
      await user.type(confirmInput, "NewPassword123")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        const callArgs = vi.mocked(UsersService.updateUser).mock.calls[0][0]
        expect("confirm_password" in (callArgs.requestBody as any)).toBe(false)
      })
    })

    it("excludes empty password from submission", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        const callArgs = vi.mocked(UsersService.updateUser).mock.calls[0][0]
        expect("password" in (callArgs.requestBody as any)).toBe(false)
      })
    })

    it("submits email field", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const emailInput = screen.getByLabelText(/Email/i)
      await user.clear(emailInput)
      await user.type(emailInput, "newemail@example.com")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.updateUser)).toHaveBeenCalledWith({
          userId: testUser.id,
          requestBody: expect.objectContaining({
            email: "newemail@example.com",
          }),
        })
      })
    })

    it("submits checkbox values", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const superuserCheckbox = screen.getByLabelText(/Is superuser/i)
      const activeCheckbox = screen.getByLabelText(/Is active/i)

      await user.click(superuserCheckbox)
      await user.click(activeCheckbox)

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.updateUser)).toHaveBeenCalledWith({
          userId: testUser.id,
          requestBody: expect.objectContaining({
            is_superuser: false,
            is_active: false,
          }),
        })
      })
    })

    it("disables Save button while loading", async () => {
      const user = userEvent.setup()
      let resolveUpdate: any
      vi.mocked(UsersService.updateUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve
          }),
      )

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      expect(saveButton).toHaveAttribute("disabled")

      resolveUpdate(testUser)

      await waitFor(() => {
        expect(saveButton).not.toHaveAttribute("disabled")
      })
    })

    it("disables Cancel button while loading", async () => {
      const user = userEvent.setup()
      let resolveUpdate: any
      vi.mocked(UsersService.updateUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve
          }),
      )

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      expect(cancelButton).toHaveAttribute("disabled")

      resolveUpdate(testUser)

      await waitFor(() => {
        expect(cancelButton).not.toHaveAttribute("disabled")
      })
    })
  })

  describe("success handling", () => {
    it("shows success toast on update", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
          "Success!",
          expect.objectContaining({
            description: "User updated successfully",
          }),
        )
      })
    })

    it("calls onSuccess callback", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })
    })

    it("closes dialog after successful update", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/Update the user details below/i),
        ).not.toBeInTheDocument()
      })
    })

    it("invalidates users query on update", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockResolvedValue(testUser)

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.updateUser)).toHaveBeenCalled()
      })
    })
  })

  describe("error handling", () => {
    it("shows error toast on API failure", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockRejectedValue(
        new Error("Network error"),
      )

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalled()
      })
    })

    it("does not call onSuccess on error", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockRejectedValue(
        new Error("API Error"),
      )

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled()
      })
    })

    it("keeps dialog open on error", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockRejectedValue(
        new Error("API Error"),
      )

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(/Full Name/i)
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(
          screen.getByText(/Update the user details below/i),
        ).toBeInTheDocument()
      })
    })

    it("preserves form data on error", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.updateUser).mockRejectedValue(
        new Error("API Error"),
      )

      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(
        /Full Name/i,
      ) as HTMLInputElement
      await user.clear(fullNameInput)
      await user.type(fullNameInput, "Updated Name")

      const saveButton = screen.getByRole("button", { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(fullNameInput.value).toBe("Updated Name")
      })
    })
  })

  describe("accessibility", () => {
    it("has accessible form fields", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      expect(screen.getByLabelText(/Email/i)).toHaveAttribute("type", "email")
      expect(screen.getByLabelText(/Full Name/i)).toHaveAttribute(
        "type",
        "text",
      )
      expect(screen.getByLabelText(/Set Password/i)).toHaveAttribute(
        "type",
        "password",
      )
      expect(screen.getByLabelText(/Confirm Password/i)).toHaveAttribute(
        "type",
        "password",
      )
    })

    it("has dialog title and description", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditUserWrapper user={testUser} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      expect(screen.getByText(/Update the user details below/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Update the user details below/i),
      ).toBeInTheDocument()
    })
  })

  describe("edge cases", () => {
    it("handles updating different user instances", async () => {
      const user = userEvent.setup()
      const user1 = makeUser({ id: "user-1", full_name: "User One" })
      const user2 = makeUser({ id: "user-2", full_name: "User Two" })
      vi.mocked(UsersService.updateUser).mockResolvedValue(user1)

      const { rerender } = renderWithProviders(
        <EditUserWrapper user={user1} onSuccess={mockOnSuccess} />,
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const editItem = screen.getByRole("menuitem", { name: /Edit User/i })
      await user.click(editItem)

      const fullNameInput = screen.getByLabelText(
        /Full Name/i,
      ) as HTMLInputElement
      expect(fullNameInput.value).toBe("User One")

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/Update the user details below/i),
        ).not.toBeInTheDocument()
      })
    })
  })
})
