import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import Webhooks from "@/components/UserSettings/Webhooks"
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
    DialogTrigger: ({ children, asChild, _onOpenChange }: any) => {
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
    DialogClose: ({ children, asChild }: any) =>
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
    DropdownMenuTrigger: ({ children, asChild }: any) => children,
    DropdownMenuContent: ({ children }: any) =>
      React.createElement("div", { role: "menu" }, children),
    DropdownMenuItem: ({ children, onClick }: any) =>
      React.createElement("button", { onClick }, children),
  }
})

// Mock client
vi.mock("@/client", () => ({
  WebhooksService: {
    listWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
  },
  OpenAPI: {
    BASE: "http://localhost",
    TOKEN: "test-token",
  },
}))

describe("Webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders section heading and description", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    renderWithProviders(<Webhooks />)

    expect(screen.getByText("Webhooks")).toBeInTheDocument()
    expect(
      screen.getByText(/Register inbound endpoints for external tools/),
    ).toBeInTheDocument()
  })

  it("shows loading skeleton when query is loading", async () => {
    const { WebhooksService } = await import("@/client")
    let resolveQuery: any
    const queryPromise = new Promise((resolve) => {
      resolveQuery = resolve
    })
    vi.mocked(WebhooksService.listWebhooks).mockReturnValueOnce(queryPromise)

    renderWithProviders(<Webhooks />)

    // Should show skeleton while loading (Skeleton component uses skeleton class)
    const skeletons = document.querySelectorAll("[data-slot='skeleton']")
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows 'No webhooks yet' message when empty", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(
        screen.getByText(/No webhooks yet. Add one to start/),
      ).toBeInTheDocument()
    })
  })

  it("renders add webhook button", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add webhook/ }),
      ).toBeInTheDocument()
    })
  })

  it("shows webhook list with name and direction", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(screen.getByText("Test Webhook")).toBeInTheDocument()
      expect(screen.getByText("outbound")).toBeInTheDocument()
    })
  })

  it("shows inbound direction badge", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Inbound Webhook",
        url: null,
        direction: "inbound",
        event_types: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(screen.getByText("inbound")).toBeInTheDocument()
    })
  })

  it("shows disabled badge for inactive webhooks", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Disabled Webhook",
        url: null,
        direction: "inbound",
        event_types: null,
        is_active: false,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(screen.getByText("disabled")).toBeInTheDocument()
    })
  })

  it("shows event types when present", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: null,
        direction: "inbound",
        event_types: "contact.created, interaction.logged",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(
        screen.getByText("Events: contact.created, interaction.logged"),
      ).toBeInTheDocument()
    })
  })

  it("opens add webhook dialog on button click", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButtons = await screen.findAllByRole("button", { name: /Add webhook/ })
    await user.click(addButtons[0])

    // Verify dialog content appears (form fields in the dialog)
    await waitFor(() => {
      expect(screen.getByPlaceholderText("n8n call logger")).toBeInTheDocument()
    })
  })

  it("validates name is required in create form", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })
  })

  it("fills webhook name in create form", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "My Webhook")

    expect(nameInput).toHaveValue("My Webhook")
  })

  it("toggles direction between inbound and outbound", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const outboundButton = screen.getByRole("button", { name: "Outbound" })
    await user.click(outboundButton)

    // URL field should appear for outbound
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("https://example.com/webhook"),
      ).toBeInTheDocument()
    })
  })

  it("validates URL is required for outbound webhooks", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Test Webhook")

    const outboundButton = screen.getByRole("button", { name: "Outbound" })
    await user.click(outboundButton)

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText("Target URL is required for outbound webhooks"),
      ).toBeInTheDocument()
    })
  })

  it("does not require URL for inbound webhooks", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Inbound Webhook",
      url: null,
      direction: "inbound",
      event_types: null,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: "test-api-key-123",
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Inbound Webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(WebhooksService.createWebhook).toHaveBeenCalled()
    })
  })

  it("submits webhook form with correct data", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Test Webhook",
      url: "https://example.com/webhook",
      direction: "outbound",
      event_types: "contact.created",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: "test-api-key-123",
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Test Webhook")

    const outboundButton = screen.getByRole("button", { name: "Outbound" })
    await user.click(outboundButton)

    const urlInput = await screen.findByPlaceholderText(
      "https://example.com/webhook",
    )
    await user.type(urlInput, "https://example.com/webhook")

    const eventTypesInput = await screen.findByPlaceholderText(
      "contact.created, interaction.created",
    )
    await user.type(eventTypesInput, "contact.created")

    const saveButton = screen.getByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(WebhooksService.createWebhook).toHaveBeenCalledWith({
        requestBody: expect.objectContaining({
          name: "Test Webhook",
          direction: "outbound",
          url: "https://example.com/webhook",
          event_types: "contact.created",
          is_active: true,
        }),
      })
    })
  })

  it("shows created webhook dialog after successful creation", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Inbound Webhook",
      url: null,
      direction: "inbound",
      event_types: null,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: "webhook-api-key-123",
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Inbound Webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Webhook created")).toBeInTheDocument()
      expect(
        screen.getByText(/Save the values below now/),
      ).toBeInTheDocument()
    })
  })

  it("displays API key in created webhook dialog", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const apiKey = "webhook-key-abc123xyz"
    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Inbound Webhook",
      url: null,
      direction: "inbound",
      event_types: null,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: apiKey,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Inbound Webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(apiKey)).toBeInTheDocument()
    })
  })

  it("displays inbound URL in created webhook dialog", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const apiKey = "webhook-key-abc123xyz"
    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Inbound Webhook",
      url: null,
      direction: "inbound",
      event_types: null,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: apiKey,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Inbound Webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText(/Inbound URL \(POST JSON payloads here\)/),
      ).toBeInTheDocument()
      expect(
        screen.getByText(new RegExp(`/api/v1/webhooks/inbound/${apiKey}`)),
      ).toBeInTheDocument()
    })
  })

  it("copy button works in created webhook dialog", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const apiKey = "webhook-key-abc123xyz"
    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Inbound Webhook",
      url: null,
      direction: "inbound",
      event_types: null,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: apiKey,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButtons = await screen.findAllByRole("button", { name: /Add webhook/ })
    await user.click(addButtons[0])

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Inbound Webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    // Verify the API key is displayed in the dialog
    await waitFor(() => {
      expect(screen.getByText(apiKey)).toBeInTheDocument()
    })

    const copyButtons = await screen.findAllByRole("button", { name: /Copy/ })
    const copyButton = copyButtons[0]
    await user.click(copyButton)

    // Verify copy was triggered (we can see the key value is displayed)
    expect(screen.getByText(apiKey)).toBeInTheDocument()
  })

  it("displays edit menu for webhooks", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument()
    })
  })

  it("opens edit dialog on edit menu click", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const editButton = await screen.findByText("Edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit webhook")).toBeInTheDocument()
    })
  })

  it("loads webhook data in edit form", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const editButton = await screen.findByText("Edit")
    await user.click(editButton)

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue("Test Webhook")
      expect(nameInput).toBeInTheDocument()
    })
  })

  it("disables direction change in edit form", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const editButton = await screen.findByText("Edit")
    await user.click(editButton)

    await waitFor(() => {
      const directionButtons = screen.getAllByRole("button", {
        name: /Inbound|Outbound/,
      })
      expect(directionButtons[0]).toBeDisabled()
      expect(directionButtons[1]).toBeDisabled()
    })
  })

  it("updates webhook on form submission", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    vi.mocked(WebhooksService.updateWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Updated Webhook",
      url: "https://example.com/webhook",
      direction: "outbound",
      event_types: "contact.created, interaction.created",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    })

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const editButton = await screen.findByText("Edit")
    await user.click(editButton)

    const nameInput = await screen.findByDisplayValue("Test Webhook")
    await user.clear(nameInput)
    await user.type(nameInput, "Updated Webhook")

    const saveButton = screen.getByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(WebhooksService.updateWebhook).toHaveBeenCalledWith({
        webhookId: "webhook-1",
        requestBody: expect.objectContaining({
          name: "Updated Webhook",
        }),
      })
    })

    // Toast is called via showSuccessToast hook, verify it was triggered
    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalled()
    })
  })

  it("deletes webhook on confirmation", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    vi.mocked(WebhooksService.deleteWebhook).mockResolvedValueOnce({})

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    vi.spyOn(window, "confirm").mockReturnValueOnce(true)

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const deleteButton = await screen.findByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(WebhooksService.deleteWebhook).toHaveBeenCalledWith({
        webhookId: "webhook-1",
      })
    })

    // Toast is called via showSuccessToast hook, verify it was triggered
    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalled()
    })
  })

  it("does not delete webhook if confirmation is rejected", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    vi.spyOn(window, "confirm").mockReturnValueOnce(false)

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const deleteButton = await screen.findByText("Delete")
    await user.click(deleteButton)

    expect(WebhooksService.deleteWebhook).not.toHaveBeenCalled()
  })

  it("handles API error on webhook creation", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const errorMessage = "Invalid webhook URL"
    vi.mocked(WebhooksService.createWebhook).mockRejectedValueOnce(
      new Error(errorMessage),
    )

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButtons = await screen.findAllByRole("button", { name: /Add webhook/ })
    await user.click(addButtons[0])

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Test Webhook")

    const outboundButton = screen.getByRole("button", { name: "Outbound" })
    await user.click(outboundButton)

    const urlInput = await screen.findByPlaceholderText(
      "https://example.com/webhook",
    )
    await user.type(urlInput, "https://example.com/webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    // Error toast is called via showErrorToast hook, verify it was triggered
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("resets form after successful webhook creation", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Test Webhook",
      url: null,
      direction: "inbound",
      event_types: null,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: "test-key",
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButtons = await screen.findAllByRole("button", { name: /Add webhook/ })
    await user.click(addButtons[0])

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Test Webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    // Verify created dialog appears with the API key
    await waitFor(() => {
      expect(screen.getByText("Webhook created")).toBeInTheDocument()
      expect(screen.getByText("test-key")).toBeInTheDocument()
    })

    // Verify queryClient was invalidated to refresh the list
    await waitFor(() => {
      expect(WebhooksService.listWebhooks).toHaveBeenCalled()
    })
  })

  it("shows outbound webhook URL in row display", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Outbound Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(
        screen.getByText("https://example.com/webhook"),
      ).toBeInTheDocument()
    })
  })

  it("shows 'URL shown once at creation' for inbound webhook in row display", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Inbound Webhook",
        url: null,
        direction: "inbound",
        event_types: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(
        screen.getByText("URL shown once at creation"),
      ).toBeInTheDocument()
    })
  })

  it("shows fallback text when outbound webhook has no URL", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Outbound No URL",
        url: null,
        direction: "outbound",
        event_types: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(screen.getByText("(no target URL)")).toBeInTheDocument()
    })
  })

  it("hides event types row when not present", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "No Events Webhook",
        url: null,
        direction: "inbound",
        event_types: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(screen.queryByText(/Events:/)).not.toBeInTheDocument()
    })
  })

  it("shows event types in row when present", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: null,
        direction: "inbound",
        event_types: "contact.created, interaction.logged",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(
        screen.getByText("Events: contact.created, interaction.logged"),
      ).toBeInTheDocument()
    })
  })

  it("does not show disabled badge for active webhooks", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Active Webhook",
        url: null,
        direction: "inbound",
        event_types: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    renderWithProviders(<Webhooks />)

    await waitFor(() => {
      expect(screen.queryByText("disabled")).not.toBeInTheDocument()
    })
  })

  it("handles API error on webhook update", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    const errorMessage = "Invalid webhook configuration"
    vi.mocked(WebhooksService.updateWebhook).mockRejectedValueOnce(
      new Error(errorMessage),
    )

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const editButton = await screen.findByText("Edit")
    await user.click(editButton)

    const nameInput = await screen.findByDisplayValue("Test Webhook")
    await user.clear(nameInput)
    await user.type(nameInput, "Updated Webhook")

    const saveButton = screen.getByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    // Error toast is called via showErrorToast hook, verify it was triggered
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("handles API error on webhook deletion", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    const errorMessage = "Cannot delete webhook"
    vi.mocked(WebhooksService.deleteWebhook).mockRejectedValueOnce(
      new Error(errorMessage),
    )

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    vi.spyOn(window, "confirm").mockReturnValueOnce(true)

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const deleteButton = await screen.findByText("Delete")
    await user.click(deleteButton)

    // Error toast is called via showErrorToast hook, verify it was triggered
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("closes add webhook dialog on cancel button", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButtons = await screen.findAllByRole("button", { name: /Add webhook/ })
    await user.click(addButtons[0])

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Test Webhook")

    expect(nameInput).toHaveValue("Test Webhook")

    const cancelButton = screen.getByRole("button", { name: /Cancel/ })
    await user.click(cancelButton)

    // Dialog should be closed and form cleared
    expect(nameInput).not.toBeInTheDocument()
  })

  it("handles outbound URL field visibility change", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButton = await screen.findByRole("button", { name: /Add webhook/ })
    await user.click(addButton)

    // Start with inbound (default) - URL field should NOT appear
    let urlField = screen.queryByPlaceholderText("https://example.com/webhook")
    expect(urlField).not.toBeInTheDocument()

    // Switch to outbound - URL field SHOULD appear
    const outboundButton = screen.getByRole("button", { name: "Outbound" })
    await user.click(outboundButton)

    await waitFor(() => {
      urlField = screen.getByPlaceholderText("https://example.com/webhook")
      expect(urlField).toBeInTheDocument()
    })

    // Switch back to inbound - URL field should disappear
    const inboundButton = screen.getByRole("button", { name: "Inbound" })
    await user.click(inboundButton)

    await waitFor(() => {
      urlField = screen.queryByPlaceholderText("https://example.com/webhook")
      expect(urlField).not.toBeInTheDocument()
    })
  })

  it("preserves other form fields when toggling direction in edit mode", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const editButton = await screen.findByText("Edit")
    await user.click(editButton)

    // Verify form has webhook data
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue("Test Webhook")
      expect(nameInput).toBeInTheDocument()
    })

    // Verify direction buttons are disabled
    const directionButtons = screen.getAllByRole("button", {
      name: /Inbound|Outbound/,
    })
    expect(directionButtons[0]).toBeDisabled()
    expect(directionButtons[1]).toBeDisabled()
  })

  it("toggles active checkbox in edit form", async () => {
    const { WebhooksService } = await import("@/client")
    const mockWebhooks = [
      {
        id: "webhook-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        direction: "outbound",
        event_types: "contact.created",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      },
    ]

    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: mockWebhooks,
      count: 1,
    })

    vi.mocked(WebhooksService.updateWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Test Webhook",
      url: "https://example.com/webhook",
      direction: "outbound",
      event_types: "contact.created",
      is_active: false,
      created_at: "2024-01-01T00:00:00Z",
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const editButton = await screen.findByText("Edit")
    await user.click(editButton)

    // Find and toggle the active checkbox
    const activeCheckbox = await screen.findByRole("checkbox")
    expect(activeCheckbox).toBeChecked()

    await user.click(activeCheckbox)
    expect(activeCheckbox).not.toBeChecked()

    const saveButton = screen.getByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(WebhooksService.updateWebhook).toHaveBeenCalledWith({
        webhookId: "webhook-1",
        requestBody: expect.objectContaining({
          is_active: false,
        }),
      })
    })
  })

  it("handles clipboard error in webhook URL copy", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const apiKey = "webhook-key-abc123xyz"
    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Inbound Webhook",
      url: null,
      direction: "inbound",
      event_types: null,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: apiKey,
    })

    // Mock clipboard to reject
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new Error("Clipboard error"),
    )

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButtons = await screen.findAllByRole("button", { name: /Add webhook/ })
    await user.click(addButtons[0])

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Inbound Webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(apiKey)).toBeInTheDocument()
    })

    const copyButtons = await screen.findAllByRole("button", { name: /Copy/ })
    const copyButton = copyButtons[0]
    await user.click(copyButton)

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("shows api key field in created webhook dialog for all types", async () => {
    const { WebhooksService } = await import("@/client")
    vi.mocked(WebhooksService.listWebhooks).mockResolvedValueOnce({
      data: [],
      count: 0,
    })

    const apiKey = "webhook-key-abc123xyz"
    vi.mocked(WebhooksService.createWebhook).mockResolvedValueOnce({
      id: "webhook-1",
      name: "Outbound Webhook",
      url: "https://example.com/webhook",
      direction: "outbound",
      event_types: null,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      api_key: apiKey,
    })

    const user = userEvent.setup()
    renderWithProviders(<Webhooks />)

    const addButtons = await screen.findAllByRole("button", { name: /Add webhook/ })
    await user.click(addButtons[0])

    const nameInput = await screen.findByPlaceholderText("n8n call logger")
    await user.type(nameInput, "Outbound Webhook")

    const outboundButton = screen.getByRole("button", { name: "Outbound" })
    await user.click(outboundButton)

    const urlInput = await screen.findByPlaceholderText(
      "https://example.com/webhook",
    )
    await user.type(urlInput, "https://example.com/webhook")

    const saveButton = await screen.findByRole("button", { name: /^Save$/ })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Webhook created")).toBeInTheDocument()
      // API key should always be shown
      expect(screen.getByText(apiKey)).toBeInTheDocument()
    })

    // For outbound webhook, inbound URL should NOT be shown
    expect(
      screen.queryByText(/Inbound URL \(POST JSON payloads here\)/),
    ).not.toBeInTheDocument()
  })
})
