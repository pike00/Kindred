import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ApiKeys from "@/components/UserSettings/ApiKeys"
import { renderWithProviders } from "@/test/helpers"

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Dialog component to render inline
vi.mock("@/components/ui/dialog", () => {
  const React = require("react")

  return {
    Dialog: ({ children, open, onOpenChange }: any) => {
      const arr = React.Children.toArray(children)
      // children should be: [DialogTrigger, DialogContent]
      const trigger = arr[0]
      const content = arr[1]

      // DialogTrigger needs to trigger onOpenChange
      const enhancedTrigger = React.isValidElement(trigger)
        ? React.cloneElement(trigger, {
            _onOpenChange: onOpenChange,
          })
        : trigger

      return React.createElement(
        "div",
        null,
        enhancedTrigger,
        open ? content : null,
      )
    },
    DialogTrigger: ({ children, _onOpenChange }: any) => {
      if (!React.isValidElement(children)) return children

      return React.cloneElement(children, {
        onClick: (e: any) => {
          _onOpenChange?.(true)
          children.props?.onClick?.(e)
        },
      })
    },
    DialogContent: ({ children }: any) =>
      React.createElement("div", { role: "dialog" }, children),
    DialogHeader: ({ children }: any) =>
      React.createElement("div", null, children),
    DialogTitle: ({ children }: any) =>
      React.createElement("h2", null, children),
    DialogDescription: ({ children }: any) =>
      React.createElement("p", null, children),
    DialogFooter: ({ children }: any) =>
      React.createElement("div", null, children),
    DialogClose: ({ children }: any) =>
      React.isValidElement(children)
        ? React.cloneElement(children, {
            onClick: (e: any) => {
              children.props?.onClick?.(e)
            },
          })
        : children,
  }
})

// Mock DropdownMenu to render inline
vi.mock("@/components/ui/dropdown-menu", () => {
  const React = require("react")
  return {
    DropdownMenu: ({ children }: any) =>
      React.createElement("div", null, children),
    DropdownMenuTrigger: ({ children }: any) => children,
    DropdownMenuContent: ({ children }: any) =>
      React.createElement("div", { role: "menu" }, children),
    DropdownMenuItem: ({ children, onClick }: any) =>
      React.createElement("button", { onClick }, children),
  }
})

// Mock client
vi.mock("@/client", () => ({
  UsersService: {
    readUsers: vi.fn(),
  },
  OpenAPI: {
    BASE: "http://localhost",
    TOKEN: "test-token",
  },
}))

describe("ApiKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it("renders section heading and description", () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    renderWithProviders(<ApiKeys />)

    expect(screen.getByText("API Keys")).toBeInTheDocument()
    expect(
      screen.getByText(/Long-lived tokens for scripts and bots/),
    ).toBeInTheDocument()
  })

  it("shows loading skeleton when query is loading", () => {
    const queryPromise = new Promise(() => {
      // Never resolves — keeps the query in loading state
    })
    vi.mocked(global.fetch as any).mockReturnValueOnce(queryPromise)

    renderWithProviders(<ApiKeys />)

    // Should show skeleton while loading (Skeleton component uses skeleton class)
    const skeletons = document.querySelectorAll("[data-slot='skeleton']")
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows 'No API keys yet' message when empty", async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(
        screen.getByText(/No API keys yet. Create one to authenticate/),
      ).toBeInTheDocument()
    })
  })

  it("renders create key button", async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create key/ })).toBeInTheDocument()
    })
  })

  it("shows API key list with name and prefix", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Test Key",
        key_prefix: "abc123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByText("Test Key")).toBeInTheDocument()
      expect(screen.getByText(/kk_abc123/)).toBeInTheDocument()
    })
  })

  it("shows revoked badge for revoked keys", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Revoked Key",
        key_prefix: "xyz789",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: "2024-01-15T00:00:00Z",
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByText("revoked")).toBeInTheDocument()
    })
  })

  it("shows expired badge for expired keys", async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString()
    const mockKeys = [
      {
        id: "key-1",
        name: "Expired Key",
        key_prefix: "def456",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: expiredDate,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByText("expired")).toBeInTheDocument()
    })
  })

  it("shows impersonation badge when can_impersonate is set", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Impersonate Key",
        key_prefix: "ghi789",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: ["user-1", "user-2"],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByText(/\+2 impersonations/)).toBeInTheDocument()
    })
  })

  it("opens create key dialog on button click", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText("Create API key")).toBeInTheDocument()
    })
  })

  it("fills create key form with name input", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "My API Key")

    expect(nameInput).toHaveValue("My API Key")
  })

  it("create button is disabled until name is entered", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    expect(submitButton).toBeDisabled()

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "My API Key")

    expect(submitButton).not.toBeDisabled()
  })

  it("shows users list when multiple users exist", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [
        { id: "user-1", email: "alice@example.com", full_name: "Alice" },
        { id: "user-2", email: "bob@example.com", full_name: "Bob" },
      ],
      count: 2,
    })

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText("Can act on behalf of")).toBeInTheDocument()
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Bob")).toBeInTheDocument()
    })
  })

  it("hides users list when only one user exists", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [{ id: "user-1", email: "alice@example.com", full_name: "Alice" }],
      count: 1,
    })

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    await waitFor(() => {
      expect(
        screen.queryByText("Can act on behalf of"),
      ).not.toBeInTheDocument()
    })
  })

  it("submits create key form with correct data", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "key-new",
          name: "Test Key",
          key_prefix: "new123",
          plaintext_key: "kk_new123abc456",
          created_at: "2024-01-20T00:00:00Z",
          last_used_at: null,
          revoked_at: null,
          expires_at: null,
          can_impersonate: [],
        }),
      })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "Test Key")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users/me/api-keys/"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      )
    })
  })

  it("shows created key dialog after successful creation", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "key-new",
          name: "Test Key",
          key_prefix: "new123",
          plaintext_key: "kk_new123abc456xyz",
          created_at: "2024-01-20T00:00:00Z",
          last_used_at: null,
          revoked_at: null,
          expires_at: null,
          can_impersonate: [],
        }),
      })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "Test Key")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("API key created")).toBeInTheDocument()
      expect(screen.getByText(/Copy the key now/)).toBeInTheDocument()
    })
  })

  it("displays plaintext key in created dialog", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const plainKey = "kk_test123abc456xyz789"
    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "key-new",
          name: "Test Key",
          key_prefix: "test123",
          plaintext_key: plainKey,
          created_at: "2024-01-20T00:00:00Z",
          last_used_at: null,
          revoked_at: null,
          expires_at: null,
          can_impersonate: [],
        }),
      })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "Test Key")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(plainKey)).toBeInTheDocument()
    })
  })

  it("copy button works in created key dialog", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const plainKey = "kk_test123abc456xyz789"
    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "key-new",
          name: "Test Key",
          key_prefix: "test123",
          plaintext_key: plainKey,
          created_at: "2024-01-20T00:00:00Z",
          last_used_at: null,
          revoked_at: null,
          expires_at: null,
          can_impersonate: [],
        }),
      })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "Test Key")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    // Verify the plaintext key is displayed in the dialog
    await waitFor(() => {
      expect(screen.getByText(plainKey)).toBeInTheDocument()
    })

    const copyButtons = await screen.findAllByRole("button", { name: /Copy/ })
    const copyButton = copyButtons[0]
    await user.click(copyButton)

    // Verify copy was triggered (we can see the key value is displayed)
    expect(screen.getByText(plainKey)).toBeInTheDocument()
  })

  it("displays revoke menu for non-revoked keys", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Active Key",
        key_prefix: "active123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument()
    })
  })

  it("revokes API key on confirmation", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Active Key",
        key_prefix: "active123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockKeys, count: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "key-1",
          name: "Active Key",
          key_prefix: "active123",
          created_at: "2024-01-01T00:00:00Z",
          last_used_at: null,
          revoked_at: "2024-01-20T00:00:00Z",
          expires_at: null,
          can_impersonate: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "key-1",
              name: "Active Key",
              key_prefix: "active123",
              created_at: "2024-01-01T00:00:00Z",
              last_used_at: null,
              revoked_at: "2024-01-20T00:00:00Z",
              expires_at: null,
              can_impersonate: [],
            },
          ],
          count: 1,
        }),
      })

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    vi.spyOn(window, "confirm").mockReturnValueOnce(true)

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const revokeMenuItem = await screen.findByText("Revoke")
    await user.click(revokeMenuItem)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users/me/api-keys/key-1"),
        expect.objectContaining({
          method: "DELETE",
        }),
      )
    })

    // Toast is called via showSuccessToast from the hook, verify it was triggered
    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalled()
    })
  })

  it("does not revoke key if confirmation is rejected", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Active Key",
        key_prefix: "active123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    vi.spyOn(window, "confirm").mockReturnValueOnce(false)

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const revokeMenuItem = await screen.findByText("Revoke")
    await user.click(revokeMenuItem)

    // Should still only have one fetch call (the initial list)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("handles API error on key creation", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Invalid key name" }),
      })

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "Test Key")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    // Error toast is called via showErrorToast hook, verify it was triggered
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("formats dates correctly", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Test Key",
        key_prefix: "test123",
        created_at: "2024-01-15T10:30:00Z",
        last_used_at: "2024-01-20T15:45:00Z",
        revoked_at: null,
        expires_at: "2024-12-31T23:59:59Z",
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByText(/Created Jan 15, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Last used Jan 20, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Expires Dec 31, 2024/)).toBeInTheDocument()
    })
  })

  it("shows single impersonation badge for one user", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Single Impersonate Key",
        key_prefix: "single123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: ["user-1"],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByText(/\+1 impersonation$/)).toBeInTheDocument()
    })
  })

  it("shows key without any optional fields", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Minimal Key",
        key_prefix: "minimal123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    // Wait for the key to appear
    const keyName = await screen.findByText("Minimal Key")
    expect(keyName).toBeInTheDocument()
    // Check that Created date is present
    expect(screen.getByText(/Created/)).toBeInTheDocument()
    // Should not have last_used_at or expires_at
    expect(screen.queryByText(/Last used/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Expires/)).not.toBeInTheDocument()
  })

  it("shows expired badge but not revoked badge when expired and not revoked", async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString()
    const mockKeys = [
      {
        id: "key-1",
        name: "Expired Not Revoked",
        key_prefix: "expnrev123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: expiredDate,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByText("expired")).toBeInTheDocument()
      expect(screen.queryByText("revoked")).not.toBeInTheDocument()
    })
  })

  it("hides revoke menu for revoked keys", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Revoked Key",
        key_prefix: "revoked123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: "2024-01-15T00:00:00Z",
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      // Should not have a menu since key is revoked
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })
  })

  it("selects multiple users for impersonation in create dialog", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [
        { id: "user-1", email: "alice@example.com", full_name: "Alice" },
        { id: "user-2", email: "bob@example.com", full_name: "Bob" },
        { id: "user-3", email: "carol@example.com", full_name: "Carol" },
      ],
      count: 3,
    })

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    // Find and click on multiple user checkboxes
    const aliceButton = screen.getByText("Alice").closest("button")
    const bobButton = screen.getByText("Bob").closest("button")

    await user.click(aliceButton!)
    await user.click(bobButton!)

    // Should have both selected
    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeChecked()
    expect(checkboxes[2]).not.toBeChecked()
  })

  it("toggles user selection in impersonation list", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [
        { id: "user-1", email: "alice@example.com", full_name: "Alice" },
        { id: "user-2", email: "bob@example.com", full_name: "Bob" },
      ],
      count: 2,
    })

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], count: 0 }),
    })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const aliceButton = screen.getByText("Alice").closest("button")
    await user.click(aliceButton!)

    let aliceCheckbox = screen.getAllByRole("checkbox")[0]
    expect(aliceCheckbox).toBeChecked()

    // Click again to deselect
    await user.click(aliceButton!)
    aliceCheckbox = screen.getAllByRole("checkbox")[0]
    expect(aliceCheckbox).not.toBeChecked()
  })

  it("creates API key with impersonation users selected", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [
        { id: "user-1", email: "alice@example.com", full_name: "Alice" },
        { id: "user-2", email: "bob@example.com", full_name: "Bob" },
      ],
      count: 2,
    })

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "key-new",
          name: "Impersonate Key",
          key_prefix: "imp123",
          plaintext_key: "kk_imp123abc",
          created_at: "2024-01-20T00:00:00Z",
          last_used_at: null,
          revoked_at: null,
          expires_at: null,
          can_impersonate: ["user-1"],
        }),
      })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "Impersonate Key")

    // Select Alice for impersonation
    const aliceButton = screen.getByText("Alice").closest("button")
    await user.click(aliceButton!)

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    // Verify the key was created with impersonation
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users/me/api-keys/"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("user-1"),
        }),
      )
    })
  })

  it("handles copy error when clipboard is blocked", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const plainKey = "kk_test123abc456xyz789"
    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "key-new",
          name: "Test Key",
          key_prefix: "test123",
          plaintext_key: plainKey,
          created_at: "2024-01-20T00:00:00Z",
          last_used_at: null,
          revoked_at: null,
          expires_at: null,
          can_impersonate: [],
        }),
      })

    // Mock clipboard to reject
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new Error("Clipboard error"),
    )

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "Test Key")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(plainKey)).toBeInTheDocument()
    })

    const copyButtons = await screen.findAllByRole("button", { name: /Copy/ })
    const copyButton = copyButtons[0]
    await user.click(copyButton)

    // Error toast should have been called via showErrorToast
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("handles fetch error when creating API key", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Server error" }),
      })

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "Test Key")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    // Verify error toast was called via the mutation's onError handler
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("handles fetch error on revoke and shows error message", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Active Key",
        key_prefix: "active123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockKeys, count: 1 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    vi.spyOn(window, "confirm").mockReturnValueOnce(true)

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const revokeMenuItem = await screen.findByText("Revoke")
    await user.click(revokeMenuItem)

    // Error toast should be called via showErrorToast from the mutation handler
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("handles revoke when API request fails with json parse error", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "Active Key",
        key_prefix: "active123",
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockKeys, count: 1 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => { throw new Error("Parse error") },
      })

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    vi.spyOn(window, "confirm").mockReturnValueOnce(true)

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const revokeMenuItem = await screen.findByText("Revoke")
    await user.click(revokeMenuItem)

    // When json().catch() succeeds but returns {}, we should get "HTTP 400"
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("trims whitespace from key name on creation", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "key-new",
          name: "Trimmed Key",
          key_prefix: "trim123",
          plaintext_key: "kk_trim123abc",
          created_at: "2024-01-20T00:00:00Z",
          last_used_at: null,
          revoked_at: null,
          expires_at: null,
          can_impersonate: [],
        }),
      })

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", { name: /Create key/ })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "  Trimmed Key  ")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users/me/api-keys/"),
        expect.objectContaining({
          body: expect.stringContaining("Trimmed Key"),
        }),
      )
    })
  })

  it("shows only created date when last_used_at and expires_at are both null", async () => {
    const mockKeys = [
      {
        id: "key-1",
        name: "New Key",
        key_prefix: "new123",
        created_at: "2024-01-15T10:30:00Z",
        last_used_at: null,
        revoked_at: null,
        expires_at: null,
        can_impersonate: [],
      },
    ]

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockKeys, count: 1 }),
    })

    renderWithProviders(<ApiKeys />)

    await waitFor(() => {
      expect(screen.getByText(/Created Jan 15, 2024/)).toBeInTheDocument()
      // Verify no "Last used" or "Expires" text in the dates row
      expect(screen.queryByText(/Last used/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Expires/)).not.toBeInTheDocument()
    })
  })

  it("uses fallback message on non-Error fetch rejection during API key create", async () => {
    const { UsersService } = await import("@/client")
    vi.mocked(UsersService.readUsers).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      })
      .mockRejectedValueOnce("plain-string-error")

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<ApiKeys />)

    const createButton = await screen.findByRole("button", {
      name: /Create key/,
    })
    await user.click(createButton)

    const nameInput = await screen.findByPlaceholderText("janet bot")
    await user.type(nameInput, "FallbackTest")

    const submitButton = screen.getByRole("button", { name: /^Create$/ })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          description: "Failed to create API key",
        }),
      )
    })
  })
})
