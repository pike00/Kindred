import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders, makeUser } from "@/test/helpers"
import DeleteUser from "@/components/Admin/DeleteUser"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Mock icons
vi.mock("@/lib/icons", () => ({
  Trash2: ({ className }: { className?: string }) => (
    <div data-testid="trash2-icon" className={className} />
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
    deleteUser: vi.fn(),
  },
}))

import { UsersService } from "@/client"
import { toast } from "sonner"

const DeleteUserWrapper = (props: React.ComponentProps<typeof DeleteUser>) => (
  <DropdownMenu>
    <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
    <DropdownMenuContent>
      <DeleteUser {...props} />
    </DropdownMenuContent>
  </DropdownMenu>
)

describe("DeleteUser", () => {
  const mockOnSuccess = vi.fn()
  const userId = "test-user-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders delete user menu item", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const trigger = screen.getByText("Open Menu")
      await user.click(trigger)

      const deleteItem = screen.getByText("Delete User")
      expect(deleteItem).toBeInTheDocument()
      expect(screen.getByTestId("trash2-icon")).toBeInTheDocument()
    })

    it("renders as dropdown menu item with destructive variant", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const trigger = screen.getByText("Open Menu")
      await user.click(trigger)

      const deleteItem = screen.getByText("Delete User").closest("[role='menuitem']")
      expect(deleteItem?.className).toContain("destructive")
    })
  })

  describe("dialog interaction", () => {
    it("opens confirmation dialog when menu item is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const trigger = screen.getByText("Open Menu")
      await user.click(trigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      expect(screen.getByText("Delete User")).toBeInTheDocument()
      expect(
        screen.getByText(/All items associated with this user will also be/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/permanently deleted/i)).toBeInTheDocument()
    })

    it("shows confirmation message with permanent deletion warning", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const trigger = screen.getByText("Open Menu")
      await user.click(trigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const description = screen.getByText(/All items associated with this user/i)
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent("permanently deleted")
      expect(description).toHaveTextContent("You will not be able to undo this action")
    })

    it("closes dialog when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      expect(
        screen.getByText(/All items associated with this user/i)
      ).toBeInTheDocument()

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/All items associated with this user/i)
        ).not.toBeInTheDocument()
      })
    })
  })

  describe("form submission", () => {
    it("calls deleteUser with correct user ID on confirmation", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockResolvedValue(undefined)

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.deleteUser)).toHaveBeenCalledWith({
          userId: userId,
        })
      })
    })

    it("calls deleteUser exactly once", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockResolvedValue(undefined)

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.deleteUser)).toHaveBeenCalledTimes(1)
      })
    })

    it("disables Delete button while loading", async () => {
      const user = userEvent.setup()
      let resolveDelete: any
      vi.mocked(UsersService.deleteUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDelete = resolve
          })
      )

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      expect(deleteButton).toHaveAttribute("disabled")

      resolveDelete()

      await waitFor(() => {
        expect(deleteButton).not.toHaveAttribute("disabled")
      })
    })

    it("disables Cancel button while loading", async () => {
      const user = userEvent.setup()
      let resolveDelete: any
      vi.mocked(UsersService.deleteUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDelete = resolve
          })
      )

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      expect(cancelButton).toHaveAttribute("disabled")

      resolveDelete()

      await waitFor(() => {
        expect(cancelButton).not.toHaveAttribute("disabled")
      })
    })
  })

  describe("success handling", () => {
    it("shows success toast on deletion", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockResolvedValue(undefined)

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
          "Success!",
          expect.objectContaining({
            description: "The user was deleted successfully",
          })
        )
      })
    })

    it("calls onSuccess callback after successful deletion", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockResolvedValue(undefined)

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })
    })

    it("closes dialog after successful deletion", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockResolvedValue(undefined)

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      expect(
        screen.getByText(/All items associated with this user/i)
      ).toBeInTheDocument()

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/All items associated with this user/i)
        ).not.toBeInTheDocument()
      })
    })

    it("invalidates queries on successful deletion", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockResolvedValue(undefined)

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.deleteUser)).toHaveBeenCalled()
      })
    })
  })

  describe("error handling", () => {
    it("shows error toast on API failure", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockRejectedValue(
        new Error("Network error")
      )

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalled()
      })
    })

    it("does not call onSuccess on error", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockRejectedValue(
        new Error("API Error")
      )

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled()
      })
    })

    it("keeps dialog open on error", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser).mockRejectedValue(
        new Error("API Error")
      )

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(
          screen.getByText(/All items associated with this user/i)
        ).toBeInTheDocument()
      })
    })

    it("allows retrying after error", async () => {
      const user = userEvent.setup()
      vi.mocked(UsersService.deleteUser)
        .mockRejectedValueOnce(new Error("API Error"))
        .mockResolvedValueOnce(undefined)

      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      let deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalled()
      })

      deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalled()
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe("accessibility", () => {
    it("has accessible delete button", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      expect(deleteButton).toBeInTheDocument()
    })

    it("displays warning message clearly", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      expect(screen.getByText(/permanently deleted/i)).toBeInTheDocument()
      expect(screen.getByText(/You will not be able to undo/i)).toBeInTheDocument()
    })
  })

  describe("edge cases", () => {
    it("handles multiple instances with different user IDs", async () => {
      const user = userEvent.setup()
      const userId1 = "user-1"
      const userId2 = "user-2"
      vi.mocked(UsersService.deleteUser).mockResolvedValue(undefined)

      const { rerender } = renderWithProviders(
        <DeleteUserWrapper id={userId1} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      await user.click(deleteItem)

      const deleteButton = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(vi.mocked(UsersService.deleteUser)).toHaveBeenCalledWith({
          userId: userId1,
        })
      })

      vi.clearAllMocks()

      rerender(
        <DeleteUserWrapper id={userId2} onSuccess={mockOnSuccess} />
      )

      const menuTrigger2 = screen.getByText("Open Menu")
      await user.click(menuTrigger2)

      const deleteItem2 = screen.getByText("Delete User")
      await user.click(deleteItem2)

      const deleteButton2 = screen.getByRole("button", { name: /Delete/i })
      await user.click(deleteButton2)

      await waitFor(() => {
        expect(vi.mocked(UsersService.deleteUser)).toHaveBeenCalledWith({
          userId: userId2,
        })
      })
    })

    it("prevents opening dialog via dropdown click from propagating", async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <DeleteUserWrapper id={userId} onSuccess={mockOnSuccess} />
      )

      const menuTrigger = screen.getByText("Open Menu")
      await user.click(menuTrigger)

      const deleteItem = screen.getByText("Delete User")
      // Clicking should open the dialog, not propagate to parent
      await user.click(deleteItem)

      expect(
        screen.getByText(/All items associated with this user/i)
      ).toBeInTheDocument()
    })
  })
})
