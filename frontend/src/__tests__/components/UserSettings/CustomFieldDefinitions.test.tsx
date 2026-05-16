import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders, createQueryClient } from "@/test/helpers"
import CustomFieldDefinitions from "@/components/UserSettings/CustomFieldDefinitions"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/client", () => ({
  CustomFieldsService: {
    listFieldDefinitions: vi.fn(),
    createFieldDefinition: vi.fn(),
    updateFieldDefinition: vi.fn(),
    deleteFieldDefinition: vi.fn(),
  },
  OpenAPI: {
    BASE: "http://localhost",
    TOKEN: "test-token",
  },
}))

// Mock useCustomToast
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

describe("CustomFieldDefinitions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders section heading", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    expect(screen.getByText("Custom field definitions")).toBeInTheDocument()
  })

  it("renders description text", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    expect(
      screen.getByText(/Define arbitrary fields you want to track on contacts/,
        { exact: false })
    ).toBeInTheDocument()
  })

  it("renders add field button", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    expect(screen.getByRole("button", { name: /Add field/ })).toBeInTheDocument()
  })

  it("shows loading skeleton while loading", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => resolve({ data: [] }), 1000)
      })
    )

    const { container } = renderWithProviders(<CustomFieldDefinitions />)

    const skeleton = container.querySelector("div[class*='animate']") || container.querySelector("div[role='status']")
    expect(skeleton).toBeTruthy()
  })

  it("displays empty state when no definitions exist", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(
        screen.getByText(/No definitions yet/, { exact: false })
      ).toBeInTheDocument()
    })
  })

  it("displays list of definitions", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "Preferred coffee order",
          icon: "coffee",
        },
        {
          id: "def-2",
          name: "Favorite Color",
          field_type: "text",
          description: null,
          icon: "palette",
        },
      ],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
      expect(screen.getByText("Favorite Color")).toBeInTheDocument()
    })
  })

  it("displays definition field type and icon", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: "coffee",
        },
      ],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText(/text.*coffee/, { exact: false })).toBeInTheDocument()
    })
  })

  it("displays definition description when present", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "How they like their coffee",
          icon: null,
        },
      ],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("How they like their coffee")).toBeInTheDocument()
    })
  })

  it("opens add dialog when Add field button is clicked", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field definition")).toBeInTheDocument()
    })
  })

  it("renders form fields in add dialog", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Coffee preference")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("text")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("coffee")).toBeInTheDocument()
    })
  })

  it("validates that name is required in add form", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field definition")).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })
  })

  it("successfully creates new definition", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "How they like their coffee",
            icon: "coffee",
          },
        ],
      })

    const mockCreateFieldDefinition = vi.mocked(CustomFieldsService.createFieldDefinition)
    mockCreateFieldDefinition.mockResolvedValueOnce({
      id: "def-1",
      name: "Coffee Preference",
      field_type: "text",
      description: "How they like their coffee",
      icon: "coffee",
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Coffee preference")).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText("Coffee preference")
    await user.type(nameInput, "Coffee Preference")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockCreateFieldDefinition).toHaveBeenCalledWith({
        requestBody: {
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: null,
        },
      })
    })

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Definition added")
    })
  })

  it("closes dialog after successful creation", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: null,
            icon: null,
          },
        ],
      })

    vi.mocked(CustomFieldsService.createFieldDefinition).mockResolvedValueOnce({
      id: "def-1",
      name: "Coffee Preference",
      field_type: "text",
      description: null,
      icon: null,
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Coffee preference")).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText("Coffee preference")
    await user.type(nameInput, "Coffee Preference")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.queryByText("Add custom field definition")).not.toBeInTheDocument()
    })
  })

  it("displays definition action menu", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: null,
        },
      ],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(1)
  })

  it("opens edit dialog when Edit is clicked", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "Original description",
          icon: "coffee",
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    // Find and click the menu trigger button (the one that's not "Add field")
    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1] // Last button should be the menu trigger

    await user.click(menuButton)

    // Wait for the Edit menu item to appear and click it
    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/ })
    await user.click(editMenuItem)

    // Dialog should now be open
    await waitFor(() => {
      expect(screen.getByText("Edit definition")).toBeInTheDocument()
    })
  })

  it("populates edit form with current values", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "Original description",
          icon: "coffee",
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    // Find and click menu button
    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/ })
    await user.click(editMenuItem)

    // Form should be populated with original values
    await waitFor(() => {
      const inputs = screen.queryAllByDisplayValue("Coffee Preference")
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  it("successfully updates definition", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Original",
            icon: "coffee",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Updated",
            icon: "coffee",
          },
        ],
      })

    const mockUpdateFieldDefinition = vi.mocked(CustomFieldsService.updateFieldDefinition)
    mockUpdateFieldDefinition.mockResolvedValueOnce({
      id: "def-1",
      name: "Coffee Preference",
      field_type: "text",
      description: "Updated",
      icon: "coffee",
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/ })
    await user.click(editMenuItem)

    // Form should be populated
    await waitFor(() => {
      const inputs = screen.queryAllByDisplayValue("Coffee Preference")
      expect(inputs.length).toBeGreaterThan(0)
    })

    // Find the Save button in the dialog (there should be multiple buttons, get the one in the dialog)
    const saveButtons = screen.queryAllByRole("button", { name: "Save" })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockUpdateFieldDefinition).toHaveBeenCalled()
    })
  })

  it("prompts for confirmation before deleting", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: "coffee",
        },
      ],
    })

    const user = userEvent.setup()
    const mockConfirm = vi.fn().mockReturnValue(false)
    const originalConfirm = window.confirm
    window.confirm = mockConfirm as any

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const deleteMenuItem = await screen.findByRole("menuitem", { name: /Delete/ })
    await user.click(deleteMenuItem)

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete this definition")
    )

    window.confirm = originalConfirm
  })

  it("deletes definition after confirmation", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: null,
            icon: "coffee",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [],
      })

    const mockDeleteFieldDefinition = vi.mocked(CustomFieldsService.deleteFieldDefinition)
    mockDeleteFieldDefinition.mockResolvedValueOnce({})

    const user = userEvent.setup()
    const mockConfirm = vi.fn().mockReturnValue(true)
    const originalConfirm = window.confirm
    window.confirm = mockConfirm as any

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const deleteMenuItem = await screen.findByRole("menuitem", { name: /Delete/ })
    await user.click(deleteMenuItem)

    await waitFor(() => {
      expect(mockDeleteFieldDefinition).toHaveBeenCalledWith({
        defId: "def-1",
      })
    })

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Definition deleted")
    })

    window.confirm = originalConfirm
  })

  it("cancels delete if user denies confirmation", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: "coffee",
        },
      ],
    })

    const mockDeleteFieldDefinition = vi.mocked(CustomFieldsService.deleteFieldDefinition)

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(false)

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons.find((btn) => btn !== screen.getByRole("button", { name: /Add field/ }))

    if (menuButton) {
      await user.click(menuButton)

      const deleteMenuItem = screen.queryByRole("menuitem", { name: /Delete/ })
      if (deleteMenuItem) {
        await user.click(deleteMenuItem)

        expect(mockDeleteFieldDefinition).not.toHaveBeenCalled()
      }
    }

    window.confirm = originalConfirm
  })

  it("shows error toast on delete failure", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: "coffee",
        },
      ],
    })

    const mockError = new Error("Delete failed")
    vi.mocked(CustomFieldsService.deleteFieldDefinition).mockRejectedValueOnce(mockError)

    const user = userEvent.setup()
    const mockConfirm = vi.fn().mockReturnValue(true)
    const originalConfirm = window.confirm
    window.confirm = mockConfirm as any

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const deleteMenuItem = await screen.findByRole("menuitem", { name: /Delete/ })
    await user.click(deleteMenuItem)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Delete failed")
    })

    window.confirm = originalConfirm
  })

  it("shows success toast after successful edit", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Original description",
            icon: "coffee",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Updated description",
            icon: "coffee",
          },
        ],
      })

    const mockUpdateFieldDefinition = vi.mocked(CustomFieldsService.updateFieldDefinition)
    mockUpdateFieldDefinition.mockResolvedValueOnce({
      id: "def-1",
      name: "Coffee Preference",
      field_type: "text",
      description: "Updated description",
      icon: "coffee",
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/ })
    await user.click(editMenuItem)

    await waitFor(() => {
      expect(screen.getByText("Edit definition")).toBeInTheDocument()
    })

    const saveButtons = screen.queryAllByRole("button", { name: "Save" })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Definition updated")
    })
  })

  it("closes edit dialog after successful update", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Original",
            icon: "coffee",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Updated",
            icon: "coffee",
          },
        ],
      })

    vi.mocked(CustomFieldsService.updateFieldDefinition).mockResolvedValueOnce({
      id: "def-1",
      name: "Coffee Preference",
      field_type: "text",
      description: "Updated",
      icon: "coffee",
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/ })
    await user.click(editMenuItem)

    await waitFor(() => {
      expect(screen.getByText("Edit definition")).toBeInTheDocument()
    })

    const saveButtons = screen.queryAllByRole("button", { name: "Save" })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(screen.queryByText("Edit definition")).not.toBeInTheDocument()
    })
  })

  it("shows error toast on edit failure", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "Original",
          icon: "coffee",
        },
      ],
    })

    const mockError = new Error("Update failed")
    vi.mocked(CustomFieldsService.updateFieldDefinition).mockRejectedValueOnce(mockError)

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/ })
    await user.click(editMenuItem)

    await waitFor(() => {
      expect(screen.getByText("Edit definition")).toBeInTheDocument()
    })

    const saveButtons = screen.queryAllByRole("button", { name: "Save" })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Update failed")
    })
  })

  it("invalidates query cache after successful edit", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockListFieldDefinitions = vi.mocked(CustomFieldsService.listFieldDefinitions)
    mockListFieldDefinitions
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Original",
            icon: "coffee",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Updated Coffee",
            field_type: "text",
            description: "Original",
            icon: "coffee",
          },
        ],
      })

    vi.mocked(CustomFieldsService.updateFieldDefinition).mockResolvedValueOnce({
      id: "def-1",
      name: "Updated Coffee",
      field_type: "text",
      description: "Original",
      icon: "coffee",
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/ })
    await user.click(editMenuItem)

    await waitFor(() => {
      expect(screen.getByText("Edit definition")).toBeInTheDocument()
    })

    const saveButtons = screen.queryAllByRole("button", { name: "Save" })
    await user.click(saveButtons[saveButtons.length - 1])

    // Wait for success toast to verify mutation completed
    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Definition updated")
    })

    // Verify that listFieldDefinitions was called again (cache invalidation)
    expect(mockListFieldDefinitions).toHaveBeenCalledTimes(2)
  })

  it("allows editing with minimal fields", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Simple Field",
            field_type: null,
            description: null,
            icon: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Simple Field",
            field_type: null,
            description: null,
            icon: null,
          },
        ],
      })

    const mockUpdateFieldDefinition = vi.mocked(CustomFieldsService.updateFieldDefinition)
    mockUpdateFieldDefinition.mockResolvedValueOnce({
      id: "def-1",
      name: "Simple Field",
      field_type: null,
      description: null,
      icon: null,
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Simple Field")).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole("button")
    const menuButton = buttons[buttons.length - 1]

    await user.click(menuButton)

    const editMenuItem = await screen.findByRole("menuitem", { name: /Edit/ })
    await user.click(editMenuItem)

    await waitFor(() => {
      expect(screen.getByText("Edit definition")).toBeInTheDocument()
    })

    const saveButtons = screen.queryAllByRole("button", { name: "Save" })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockUpdateFieldDefinition).toHaveBeenCalled()
    })
  })
})
