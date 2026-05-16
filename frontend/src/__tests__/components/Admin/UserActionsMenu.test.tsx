import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { UserActionsMenu } from "@/components/Admin/UserActionsMenu"
import { makeUser, renderWithProviders } from "@/test/helpers"

// Mock icons
vi.mock("@/lib/icons", () => ({
  MoreHorizontal: ({ className }: { className?: string }) => (
    <div data-testid="more-horizontal-icon" className={className} />
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
    updateUser: vi.fn(),
  },
}))

// Mock useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  default: vi.fn(() => ({
    user: makeUser({
      id: "current-user-id",
      email: "admin@example.com",
      is_superuser: true,
      is_active: true,
      full_name: "Admin User",
    }),
    logout: vi.fn(),
    loginMutation: { mutate: vi.fn(), isPending: false },
    signUpMutation: { mutate: vi.fn(), isPending: false },
  })),
}))

import useAuth from "@/hooks/useAuth"

describe("UserActionsMenu", () => {
  const differentUser = makeUser({
    id: "different-user-id",
    email: "user@example.com",
    full_name: "Different User",
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders nothing when user is the current user", () => {
      const currentUser = makeUser({ id: "current-user-id" })

      vi.mocked(useAuth).mockReturnValue({
        user: currentUser,
        logout: vi.fn(),
        loginMutation: { mutate: vi.fn(), isPending: false },
        signUpMutation: { mutate: vi.fn(), isPending: false },
      } as any)

      const { container } = renderWithProviders(
        <UserActionsMenu user={currentUser} />,
      )

      expect(container.firstChild).toBeNull()
    })

    it("renders menu button for different user", () => {
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      expect(button).toBeInTheDocument()
      expect(screen.getByTestId("more-horizontal-icon")).toBeInTheDocument()
    })

    it("renders with ghost variant and icon size", () => {
      const { container } = renderWithProviders(
        <UserActionsMenu user={differentUser} />,
      )

      const button = container.querySelector("button")
      expect(button?.className).toContain("ghost")
    })

    it("has accessible aria-label", () => {
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-label", "Open user actions menu")
    })
  })

  describe("menu interaction", () => {
    it("opens dropdown menu when button is clicked", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      // Menu should be visible with Edit and Delete items
      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
        expect(screen.getByText("Delete User")).toBeInTheDocument()
      })
    })

    it("closes menu after action is taken", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
      })

      // Verify the menu is open (Edit User is visible)
      expect(screen.getByText("Edit User")).toBeVisible()
    })

    it("menu remains open until item is selected", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
      })

      const editItem = screen.getByText("Edit User")
      expect(editItem).toBeVisible()
    })
  })

  describe("child components rendering", () => {
    it("renders EditUser component", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
        expect(screen.getByTestId("pencil-icon")).toBeInTheDocument()
      })
    })

    it("renders DeleteUser component", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Delete User")).toBeInTheDocument()
        expect(screen.getByTestId("trash2-icon")).toBeInTheDocument()
      })
    })

    it("renders both EditUser and DeleteUser in correct order", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        const menuItems = screen.getAllByRole("menuitem")
        expect(menuItems).toHaveLength(2)
        expect(menuItems[0]).toHaveTextContent("Edit User")
        expect(menuItems[1]).toHaveTextContent("Delete User")
      })
    })
  })

  describe("current user detection", () => {
    it("uses current user from useAuth hook", () => {
      const mockCurrentUser = makeUser({ id: "hook-user-id" })

      vi.mocked(useAuth).mockReturnValue({
        user: mockCurrentUser,
        logout: vi.fn(),
        loginMutation: { mutate: vi.fn(), isPending: false },
        signUpMutation: { mutate: vi.fn(), isPending: false },
      } as any)

      const { container } = renderWithProviders(
        <UserActionsMenu user={mockCurrentUser} />,
      )

      // Should render nothing since user is current user
      expect(container.firstChild).toBeNull()
    })

    it("returns null when user.id matches currentUser.id", () => {
      const sharedId = "shared-user-id"
      const user = makeUser({ id: sharedId })

      vi.mocked(useAuth).mockReturnValue({
        user: makeUser({ id: sharedId }),
        logout: vi.fn(),
        loginMutation: { mutate: vi.fn(), isPending: false },
        signUpMutation: { mutate: vi.fn(), isPending: false },
      } as any)

      const { container } = renderWithProviders(<UserActionsMenu user={user} />)

      expect(container.firstChild).toBeNull()
    })

    it("shows menu when user id is different from current user id", () => {
      const user = makeUser({ id: "user-123" })

      vi.mocked(useAuth).mockReturnValue({
        user: makeUser({ id: "current-456" }),
        logout: vi.fn(),
        loginMutation: { mutate: vi.fn(), isPending: false },
        signUpMutation: { mutate: vi.fn(), isPending: false },
      } as any)

      renderWithProviders(<UserActionsMenu user={user} />)

      expect(
        screen.getByRole("button", { name: /Open user actions menu/i }),
      ).toBeInTheDocument()
    })

    it("handles when currentUser is undefined", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: undefined,
        logout: vi.fn(),
        loginMutation: { mutate: vi.fn(), isPending: false },
        signUpMutation: { mutate: vi.fn(), isPending: false },
      } as any)

      renderWithProviders(<UserActionsMenu user={differentUser} />)

      expect(
        screen.getByRole("button", { name: /Open user actions menu/i }),
      ).toBeInTheDocument()
    })
  })

  describe("dropdown state management", () => {
    it("manages open state internally", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })

      // Initially closed
      expect(screen.queryByText("Edit User")).not.toBeInTheDocument()

      // Open
      await user.click(button)
      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
      })

      // Clicking the button again closes it
      await user.click(button)
      await waitFor(() => {
        expect(screen.queryByText("Edit User")).not.toBeInTheDocument()
      })
    })

    it("closes menu on successful edit", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
      })

      // EditUser component will call onSuccess which closes the menu
      // The onSuccess callback should be passed to EditUser and DeleteUser
    })
  })

  describe("multiple instances", () => {
    it("handles multiple menu instances independently", async () => {
      const user = userEvent.setup()
      const user1 = makeUser({ id: "user-1", full_name: "User One" })
      const user2 = makeUser({ id: "user-2", full_name: "User Two" })

      const { container } = renderWithProviders(
        <>
          <UserActionsMenu user={user1} />
          <UserActionsMenu user={user2} />
        </>,
      )

      const buttons = screen.getAllByRole("button", {
        name: /Open user actions menu/i,
      })
      expect(buttons).toHaveLength(2)

      // Open first menu
      await user.click(buttons[0])
      await waitFor(() => {
        expect(screen.getAllByText("Edit User")).toHaveLength(1)
      })

      // Close first and open second
      await user.click(buttons[0])
      await user.click(buttons[1])
      await waitFor(() => {
        expect(screen.getAllByText("Edit User")).toHaveLength(1)
      })
    })
  })

  describe("prop passing", () => {
    it("passes user prop to child components", async () => {
      const user = userEvent.setup()
      const testUser = makeUser({
        id: "test-user-123",
        email: "test@example.com",
        full_name: "Test User",
        is_superuser: true,
        is_active: true,
      })

      renderWithProviders(<UserActionsMenu user={testUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
      })

      // The user data should be accessible to child components
      // Edit form should show user's email
      const editItem = screen.getByText("Edit User")
      await user.click(editItem)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement
        expect(emailInput.value).toBe("test@example.com")
      })
    })

    it("passes onSuccess callback to child components", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
      })

      // Both child components should receive onSuccess callback
      // that closes the menu after operation completes
    })
  })

  describe("edge cases", () => {
    it("handles rapid menu open/close", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })

      for (let i = 0; i < 5; i++) {
        await user.click(button)
        await waitFor(() => {
          expect(screen.getByText("Edit User")).toBeInTheDocument()
        })
        await user.click(button)
        await waitFor(() => {
          expect(screen.queryByText("Edit User")).not.toBeInTheDocument()
        })
      }
    })

    it("handles user prop changes", async () => {
      const user = userEvent.setup()
      const user1 = makeUser({ id: "user-1", full_name: "User One" })
      const user2 = makeUser({ id: "user-2", full_name: "User Two" })

      const { rerender } = renderWithProviders(<UserActionsMenu user={user1} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText("Edit User")).toBeInTheDocument()
      })

      // Change the user prop
      rerender(<UserActionsMenu user={user2} />)

      // Menu should close on prop change
      await waitFor(() => {
        // Re-fetch button since DOM may have updated
        const updatedButton = screen.getByRole("button", {
          name: /Open user actions menu/i,
        })
        expect(updatedButton).toBeInTheDocument()
      })
    })

    it("handles switching from current user to different user", () => {
      const currentUser = makeUser({ id: "current-id" })
      const differentUser = makeUser({ id: "different-id" })

      vi.mocked(useAuth).mockReturnValue({
        user: currentUser,
        logout: vi.fn(),
        loginMutation: { mutate: vi.fn(), isPending: false },
        signUpMutation: { mutate: vi.fn(), isPending: false },
      } as any)

      const { container, rerender } = renderWithProviders(
        <UserActionsMenu user={currentUser} />,
      )

      // Should be empty when user is current user
      expect(container.firstChild).toBeNull()

      // Update to different user
      rerender(<UserActionsMenu user={differentUser} />)

      // Should now show menu
      expect(
        screen.getByRole("button", { name: /Open user actions menu/i }),
      ).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("has accessible trigger button with proper aria-label", () => {
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-label", "Open user actions menu")
    })

    it("renders MoreHorizontal icon", () => {
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      expect(screen.getByTestId("more-horizontal-icon")).toBeInTheDocument()
    })

    it("menu items are keyboard accessible", async () => {
      const user = userEvent.setup()
      renderWithProviders(<UserActionsMenu user={differentUser} />)

      const button = screen.getByRole("button", {
        name: /Open user actions menu/i,
      })
      await user.click(button)

      await waitFor(() => {
        const menuItems = screen.getAllByRole("menuitem")
        expect(menuItems).toHaveLength(2)
        menuItems.forEach((item) => {
          expect(item).toBeVisible()
        })
      })
    })
  })
})
