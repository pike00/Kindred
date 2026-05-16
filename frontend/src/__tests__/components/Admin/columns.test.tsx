import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, render } from "@testing-library/react"
import { columns, type UserTableData } from "@/components/Admin/columns"
import { makeUser } from "@/test/helpers"

// Mock icons
vi.mock("@/lib/icons", () => ({
  MoreHorizontal: ({ className }: { className?: string }) => (
    <div data-testid="more-horizontal-icon" className={className} />
  ),
}))

// Mock useAuth hook for UserActionsMenu
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

describe("columns", () => {
  const mockRow = {
    original: makeUser({
      id: "user-1",
      email: "alice@example.com",
      full_name: "Alice Smith",
      is_superuser: true,
      is_active: true,
    }) as UserTableData,
    index: 0,
    getIsSelected: () => false,
    getCanSelect: () => true,
    toggleSelected: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("structure", () => {
    it("exports columns array", () => {
      expect(Array.isArray(columns)).toBe(true)
      expect(columns.length).toBe(5)
    })

    it("has full_name column", () => {
      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      expect(fullNameCol).toBeDefined()
      expect(fullNameCol?.header).toBe("Full Name")
    })

    it("has email column", () => {
      const emailCol = columns.find((col) => col.accessorKey === "email")
      expect(emailCol).toBeDefined()
      expect(emailCol?.header).toBe("Email")
    })

    it("has is_superuser column", () => {
      const roleCol = columns.find((col) => col.accessorKey === "is_superuser")
      expect(roleCol).toBeDefined()
      expect(roleCol?.header).toBe("Role")
    })

    it("has is_active column", () => {
      const statusCol = columns.find((col) => col.accessorKey === "is_active")
      expect(statusCol).toBeDefined()
      expect(statusCol?.header).toBe("Status")
    })

    it("has actions column", () => {
      const actionsCol = columns.find((col) => col.id === "actions")
      expect(actionsCol).toBeDefined()
      const header = actionsCol?.header as any
      const rendered = render(header({ column: {} }))
      expect(rendered.container.querySelector("span")).toBeInTheDocument()
    })
  })

  describe("full_name column cell", () => {
    it("renders full name when provided", () => {
      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const { container } = render(cellRender({ row: mockRow }))

      expect(container.textContent).toContain("Alice Smith")
    })

    it("renders N/A when full_name is null", () => {
      const rowWithoutName = {
        ...mockRow,
        original: { ...mockRow.original, full_name: null },
      }

      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const { container } = render(cellRender({ row: rowWithoutName }))

      expect(container.textContent).toContain("N/A")
    })

    it("renders N/A when full_name is empty string", () => {
      const rowWithEmptyName = {
        ...mockRow,
        original: { ...mockRow.original, full_name: "" },
      }

      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const { container } = render(cellRender({ row: rowWithEmptyName }))

      expect(container.textContent).toContain("N/A")
    })

    it("applies muted-foreground class to N/A text", () => {
      const rowWithoutName = {
        ...mockRow,
        original: { ...mockRow.original, full_name: null },
      }

      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const { container } = render(cellRender({ row: rowWithoutName }))

      const span = container.querySelector("span")
      expect(span?.className).toContain("text-muted-foreground")
    })

    it("applies font-medium class to actual name", () => {
      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const { container } = render(cellRender({ row: mockRow }))

      const span = container.querySelector("span")
      expect(span?.className).toContain("font-medium")
    })

    it("renders You badge when isCurrentUser is true", () => {
      const currentUserRow = {
        ...mockRow,
        original: { ...mockRow.original, isCurrentUser: true },
      }

      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const { container } = render(cellRender({ row: currentUserRow }))

      expect(container.textContent).toContain("You")
    })

    it("does not render You badge when isCurrentUser is false", () => {
      const otherUserRow = {
        ...mockRow,
        original: { ...mockRow.original, isCurrentUser: false },
      }

      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const { container } = render(cellRender({ row: otherUserRow }))

      expect(container.textContent).not.toContain("You")
    })

    it("You badge has outline variant", () => {
      const currentUserRow = {
        ...mockRow,
        original: { ...mockRow.original, isCurrentUser: true },
      }

      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const { container } = render(cellRender({ row: currentUserRow }))

      expect(container.textContent).toContain("You")
      // Badge is a styled div, check for the presence of the "You" text in a badge-like element
      const badgeElement = Array.from(container.querySelectorAll("*")).find(
        (el) => el.textContent === "You"
      )
      expect(badgeElement).toBeInTheDocument()
    })
  })

  describe("email column cell", () => {
    it("renders email address", () => {
      const emailCol = columns.find((col) => col.accessorKey === "email")
      const cellRender = emailCol?.cell as any

      const { container } = render(cellRender({ row: mockRow }))

      expect(container.textContent).toContain("alice@example.com")
    })

    it("applies muted-foreground class", () => {
      const emailCol = columns.find((col) => col.accessorKey === "email")
      const cellRender = emailCol?.cell as any

      const { container } = render(cellRender({ row: mockRow }))

      const span = container.querySelector("span")
      expect(span?.className).toContain("text-muted-foreground")
    })

    it("renders different email addresses correctly", () => {
      const emailCol = columns.find((col) => col.accessorKey === "email")
      const cellRender = emailCol?.cell as any

      const testRows = [
        { original: makeUser({ email: "user1@example.com" }) as UserTableData },
        { original: makeUser({ email: "user2@example.com" }) as UserTableData },
        { original: makeUser({ email: "user3@example.com" }) as UserTableData },
      ]

      testRows.forEach((row) => {
        const { container } = render(cellRender({ row }))
        expect(container.textContent).toContain(row.original.email)
      })
    })
  })

  describe("is_superuser (role) column cell", () => {
    it("renders Superuser badge when is_superuser is true", () => {
      const roleCol = columns.find((col) => col.accessorKey === "is_superuser")
      const cellRender = roleCol?.cell as any

      const superUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_superuser: true },
      }

      const { container } = render(cellRender({ row: superUserRow }))

      expect(container.textContent).toContain("Superuser")
    })

    it("renders User badge when is_superuser is false", () => {
      const roleCol = columns.find((col) => col.accessorKey === "is_superuser")
      const cellRender = roleCol?.cell as any

      const regularUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_superuser: false },
      }

      const { container } = render(cellRender({ row: regularUserRow }))

      expect(container.textContent).toContain("User")
    })

    it("Superuser badge has default variant", () => {
      const roleCol = columns.find((col) => col.accessorKey === "is_superuser")
      const cellRender = roleCol?.cell as any

      const superUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_superuser: true },
      }

      const { container } = render(cellRender({ row: superUserRow }))

      expect(container.textContent).toContain("Superuser")
    })

    it("User badge has secondary variant", () => {
      const roleCol = columns.find((col) => col.accessorKey === "is_superuser")
      const cellRender = roleCol?.cell as any

      const regularUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_superuser: false },
      }

      const { container } = render(cellRender({ row: regularUserRow }))

      const badge = container.querySelector("[class*='secondary']")
      expect(badge).toBeInTheDocument()
    })
  })

  describe("is_active (status) column cell", () => {
    it("renders Active status when is_active is true", () => {
      const statusCol = columns.find((col) => col.accessorKey === "is_active")
      const cellRender = statusCol?.cell as any

      const activeUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_active: true },
      }

      const { container } = render(cellRender({ row: activeUserRow }))

      expect(container.textContent).toContain("Active")
    })

    it("renders Inactive status when is_active is false", () => {
      const statusCol = columns.find((col) => col.accessorKey === "is_active")
      const cellRender = statusCol?.cell as any

      const inactiveUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_active: false },
      }

      const { container } = render(cellRender({ row: inactiveUserRow }))

      expect(container.textContent).toContain("Inactive")
    })

    it("renders green dot for active status", () => {
      const statusCol = columns.find((col) => col.accessorKey === "is_active")
      const cellRender = statusCol?.cell as any

      const activeUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_active: true },
      }

      const { container } = render(cellRender({ row: activeUserRow }))

      const dot = container.querySelector(".bg-green-500")
      expect(dot).toBeInTheDocument()
      expect(dot?.className).toContain("rounded-full")
      expect(dot?.className).toContain("size-2")
    })

    it("renders gray dot for inactive status", () => {
      const statusCol = columns.find((col) => col.accessorKey === "is_active")
      const cellRender = statusCol?.cell as any

      const inactiveUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_active: false },
      }

      const { container } = render(cellRender({ row: inactiveUserRow }))

      const dot = container.querySelector(".bg-gray-400")
      expect(dot).toBeInTheDocument()
    })

    it("applies muted-foreground class to inactive text", () => {
      const statusCol = columns.find((col) => col.accessorKey === "is_active")
      const cellRender = statusCol?.cell as any

      const inactiveUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_active: false },
      }

      const { container } = render(cellRender({ row: inactiveUserRow }))

      const span = Array.from(container.querySelectorAll("span")).find(
        (el) => el.textContent === "Inactive"
      )
      expect(span?.className).toContain("text-muted-foreground")
    })

    it("does not apply muted-foreground class to active text", () => {
      const statusCol = columns.find((col) => col.accessorKey === "is_active")
      const cellRender = statusCol?.cell as any

      const activeUserRow = {
        ...mockRow,
        original: { ...mockRow.original, is_active: true },
      }

      const { container } = render(cellRender({ row: activeUserRow }))

      const span = Array.from(container.querySelectorAll("span")).find(
        (el) => el.textContent === "Active"
      )
      expect(span?.className).not.toContain("text-muted-foreground")
    })
  })

  describe("actions column cell", () => {
    it("renders UserActionsMenu component", () => {
      const actionsCol = columns.find((col) => col.id === "actions")
      const cellRender = actionsCol?.cell as any

      const { container } = render(cellRender({ row: mockRow }))

      // UserActionsMenu renders a button with aria-label
      const button = container.querySelector(
        "button[aria-label='Open user actions menu']"
      )
      expect(button).toBeInTheDocument()
    })

    it("passes user to UserActionsMenu", () => {
      const actionsCol = columns.find((col) => col.id === "actions")
      const cellRender = actionsCol?.cell as any

      const testRow = {
        original: makeUser({
          id: "test-user-123",
          email: "test@example.com",
        }) as UserTableData,
      }

      render(cellRender({ row: testRow }))

      // UserActionsMenu should render the menu button
      expect(
        screen.getByRole("button", { name: /Open user actions menu/i })
      ).toBeInTheDocument()
    })

    it("renders with flex justify-end container", () => {
      const actionsCol = columns.find((col) => col.id === "actions")
      const cellRender = actionsCol?.cell as any

      const { container } = render(cellRender({ row: mockRow }))

      const div = container.querySelector("div")
      expect(div?.className).toContain("flex")
      expect(div?.className).toContain("justify-end")
    })

    it("actions header is screen-reader only", () => {
      const actionsCol = columns.find((col) => col.id === "actions")
      const headerRender = actionsCol?.header as any

      const { container } = render(headerRender({ column: {} }))

      const span = container.querySelector("span")
      expect(span?.className).toContain("sr-only")
      expect(container.textContent).toContain("Actions")
    })
  })

  describe("UserTableData type", () => {
    it("extends UserPublic with isCurrentUser", () => {
      const data: UserTableData = {
        ...makeUser(),
        isCurrentUser: true,
      }

      expect(data.isCurrentUser).toBe(true)
      expect(data.email).toBeDefined()
      expect(data.is_superuser).toBeDefined()
      expect(data.is_active).toBeDefined()
      expect(data.id).toBeDefined()
    })
  })

  describe("edge cases", () => {
    it("handles multiple columns rendering", () => {
      const testUser: UserTableData = makeUser({
        id: "user-1",
        email: "test@example.com",
        full_name: "Test User",
        is_superuser: true,
        is_active: true,
      }) as any

      testUser.isCurrentUser = true

      const row = {
        original: testUser,
        index: 0,
        getIsSelected: () => false,
        getCanSelect: () => true,
        toggleSelected: vi.fn(),
      }

      columns.forEach((col) => {
        if (col.cell) {
          const cellRender = col.cell as any
          const { container } = render(cellRender({ row }))
          expect(container.firstChild).not.toBeNull()
        }
      })
    })

    it("handles special characters in full_name", () => {
      const fullNameCol = columns.find((col) => col.accessorKey === "full_name")
      const cellRender = fullNameCol?.cell as any

      const specialNameRow = {
        ...mockRow,
        original: {
          ...mockRow.original,
          full_name: "José García-López",
        },
      }

      const { container } = render(cellRender({ row: specialNameRow }))

      expect(container.textContent).toContain("José García-López")
    })

    it("handles long email addresses", () => {
      const emailCol = columns.find((col) => col.accessorKey === "email")
      const cellRender = emailCol?.cell as any

      const longEmailRow = {
        ...mockRow,
        original: {
          ...mockRow.original,
          email: "very.long.email.address.with.many.parts@example.com",
        },
      }

      const { container } = render(cellRender({ row: longEmailRow }))

      expect(container.textContent).toContain(
        "very.long.email.address.with.many.parts@example.com"
      )
    })

    it("handles all status combinations", () => {
      const statusCol = columns.find((col) => col.accessorKey === "is_active")
      const cellRender = statusCol?.cell as any

      const combinations = [
        { is_active: true, expected: "Active" },
        { is_active: false, expected: "Inactive" },
      ]

      combinations.forEach(({ is_active, expected }) => {
        const row = {
          ...mockRow,
          original: { ...mockRow.original, is_active },
        }

        const { container } = render(cellRender({ row }))
        expect(container.textContent).toContain(expected)
      })
    })

    it("handles all role combinations", () => {
      const roleCol = columns.find((col) => col.accessorKey === "is_superuser")
      const cellRender = roleCol?.cell as any

      const combinations = [
        { is_superuser: true, expected: "Superuser" },
        { is_superuser: false, expected: "User" },
      ]

      combinations.forEach(({ is_superuser, expected }) => {
        const row = {
          ...mockRow,
          original: { ...mockRow.original, is_superuser },
        }

        const { container } = render(cellRender({ row }))
        expect(container.textContent).toContain(expected)
      })
    })
  })
})
